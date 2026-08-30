import io

from django.test import TestCase
from django.utils import timezone

from tracker.csv_import import (
    _parse_date_added,
    _parse_rating,
    _parse_year,
    extract_new_folder_names,
    map_condition,
    parse_csv_rows,
)
from tracker.models import Folder

SAMPLE_CSV = (
    "Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,"
    "CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition\n"
    'ABC123,Radiohead,"OK Computer","Parlophone","Vinyl, LP",5,1997,553236,'
    'Rock,2020-05-14 10:32:01,"Very Good Plus (VG+)","Near Mint (NM or M-)"\n'
    ",Boards of Canada,Music Has the Right to Children,Warp,CD,,1998,12345,,"
    "2021-01-01 00:00:00,,\n"
)


class ParseCsvRowsTests(TestCase):
    def test_parses_quoted_fields_with_commas(self):
        rows = parse_csv_rows(io.BytesIO(SAMPLE_CSV.encode("utf-8")))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["Format"], "Vinyl, LP")
        self.assertEqual(rows[0]["Title"], "OK Computer")

    def test_handles_blank_optional_fields(self):
        rows = parse_csv_rows(io.BytesIO(SAMPLE_CSV.encode("utf-8")))
        self.assertEqual(rows[1]["Catalog#"], "")
        self.assertEqual(rows[1]["CollectionFolder"], "")


class ExtractNewFolderNamesTests(TestCase):
    def test_returns_distinct_non_empty_new_folders_sorted(self):
        rows = [
            {"CollectionFolder": "Rock"},
            {"CollectionFolder": "Jazz"},
            {"CollectionFolder": "Rock"},
            {"CollectionFolder": ""},
        ]
        result = extract_new_folder_names(rows, existing_names=[])
        self.assertEqual(result, ["Jazz", "Rock"])

    def test_excludes_already_existing_folders(self):
        Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        rows = [{"CollectionFolder": "Rock"}, {"CollectionFolder": "Jazz"}]
        existing = Folder.objects.values_list("name", flat=True)
        result = extract_new_folder_names(rows, existing_names=existing)
        self.assertEqual(result, ["Jazz"])


class MapConditionTests(TestCase):
    def test_maps_known_conditions(self):
        self.assertEqual(map_condition("Mint (M)"), "Mint")
        self.assertEqual(map_condition("Very Good Plus (VG+)"), "Very Good Plus")
        self.assertEqual(map_condition("Near Mint (NM or M-)"), "Near Mint")

    def test_blank_returns_none(self):
        self.assertIsNone(map_condition(""))
        self.assertIsNone(map_condition(None))

    def test_unrecognized_value_returns_none(self):
        self.assertIsNone(map_condition("Not A Real Condition (???)"))


class ParseHelperTests(TestCase):
    def test_parse_date_added_parses_discogs_format(self):
        result = _parse_date_added("2020-05-14 10:32:01")
        self.assertTrue(timezone.is_aware(result))
        self.assertEqual(result.year, 2020)
        self.assertEqual(result.month, 5)
        self.assertEqual(result.day, 14)

    def test_parse_date_added_defaults_to_now_when_blank(self):
        before = timezone.now()
        result = _parse_date_added("")
        after = timezone.now()
        self.assertTrue(before <= result <= after)

    def test_parse_rating_valid_and_invalid(self):
        self.assertEqual(_parse_rating("5"), 5)
        self.assertIsNone(_parse_rating(""))
        self.assertIsNone(_parse_rating("not-a-number"))

    def test_parse_year_valid_and_invalid(self):
        self.assertEqual(_parse_year("1997"), 1997)
        self.assertIsNone(_parse_year(""))


from tracker.csv_import import commit_import
from tracker.models import Release


def fake_cover_art(release_id):
    return f"http://example.com/{release_id}.jpg"


def failing_cover_art(release_id):
    raise RuntimeError("Discogs is down")


class CommitImportTests(TestCase):
    def test_creates_releases_and_folders_per_folder_mode(self):
        rows = [
            {
                "Catalog#": "ABC123", "Artist": "Radiohead", "Title": "OK Computer",
                "Label": "Parlophone", "Format": "Vinyl, LP", "Rating": "5",
                "Released": "1997", "release_id": "553236", "CollectionFolder": "Rock",
                "Date Added": "2020-05-14 10:32:01",
                "Collection Media Condition": "Very Good Plus (VG+)",
                "Collection Sleeve Condition": "Near Mint (NM or M-)",
            },
            {
                "Catalog#": "", "Artist": "Boards of Canada", "Title": "Music Has the Right to Children",
                "Label": "Warp", "Format": "CD", "Rating": "", "Released": "1998",
                "release_id": "12345", "CollectionFolder": "", "Date Added": "2021-01-01 00:00:00",
                "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "per_folder", fake_cover_art)

        self.assertEqual(summary["created"], 2)
        self.assertEqual(summary["skipped_duplicates"], 0)
        self.assertEqual(sorted(summary["folders_created"]), ["Main", "Rock"])

        rock_release = Release.objects.get(discogs_release_id=553236)
        self.assertEqual(rock_release.folder.name, "Rock")
        self.assertEqual(rock_release.media_condition, "Very Good Plus")
        self.assertEqual(rock_release.cover_art_url, "http://example.com/553236.jpg")

        main_release = Release.objects.get(discogs_release_id=12345)
        self.assertEqual(main_release.folder.name, "Main")

    def test_main_only_mode_routes_everything_to_main(self):
        rows = [
            {
                "Catalog#": "", "Artist": "A", "Title": "B", "Label": "", "Format": "",
                "Rating": "", "Released": "", "release_id": "1", "CollectionFolder": "Rock",
                "Date Added": "", "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "main_only", fake_cover_art)

        self.assertEqual(summary["folders_created"], ["Main"])
        self.assertEqual(Release.objects.get(discogs_release_id=1).folder.name, "Main")

    def test_skips_existing_collection_duplicates(self):
        folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        Release.objects.create(
            discogs_release_id=1, artist="A", title="B", status=Release.STATUS_COLLECTION,
            folder=folder, date_added=timezone.now(),
        )
        rows = [
            {
                "Catalog#": "", "Artist": "A", "Title": "B", "Label": "", "Format": "",
                "Rating": "", "Released": "", "release_id": "1", "CollectionFolder": "Rock",
                "Date Added": "", "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "per_folder", fake_cover_art)

        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["skipped_duplicates"], 1)
        self.assertEqual(Release.objects.filter(discogs_release_id=1).count(), 1)

    def test_cover_art_failure_leaves_row_created_without_url(self):
        rows = [
            {
                "Catalog#": "", "Artist": "A", "Title": "B", "Label": "", "Format": "",
                "Rating": "", "Released": "", "release_id": "1", "CollectionFolder": "Rock",
                "Date Added": "", "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "per_folder", failing_cover_art)

        self.assertEqual(summary["created"], 1)
        release = Release.objects.get(discogs_release_id=1)
        self.assertEqual(release.cover_art_url, "")
