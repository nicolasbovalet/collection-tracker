import csv
import io

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.csv_export import build_export_rows, render_csv, unmap_condition
from tracker.models import Folder, Release

EXPECTED_HEADER = [
    "Catalog#",
    "Artist",
    "Title",
    "Label",
    "Format",
    "Rating",
    "Released",
    "release_id",
    "CollectionFolder",
    "Date Added",
    "Collection Media Condition",
    "Collection Sleeve Condition",
]


class UnmapConditionTests(TestCase):
    def test_round_trips_known_values(self):
        self.assertEqual(unmap_condition("Mint"), "Mint (M)")
        self.assertEqual(unmap_condition("Near Mint"), "Near Mint (NM or M-)")
        self.assertEqual(unmap_condition("Very Good Plus"), "Very Good Plus (VG+)")
        self.assertEqual(unmap_condition("Very Good"), "Very Good (VG)")
        self.assertEqual(unmap_condition("Good Plus"), "Good Plus (G+)")
        self.assertEqual(unmap_condition("Good"), "Good (G)")
        self.assertEqual(unmap_condition("Fair"), "Fair (F)")
        self.assertEqual(unmap_condition("Poor"), "Poor (P)")

    def test_none_and_empty_return_empty_string(self):
        self.assertEqual(unmap_condition(None), "")
        self.assertEqual(unmap_condition(""), "")

    def test_unrecognized_value_returned_unchanged(self):
        self.assertEqual(unmap_condition("Not A Real Condition"), "Not A Real Condition")

    def test_never_raises_on_odd_input(self):
        # Defensive: even weird-shaped input should not raise.
        self.assertEqual(unmap_condition("   "), "   ")
        self.assertEqual(unmap_condition(0), "")


class BuildExportRowsTests(TestCase):
    def test_fully_populated_release_with_folder(self):
        folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        date_added = timezone.make_aware(timezone.datetime(2020, 5, 14, 10, 32, 1))
        release = Release.objects.create(
            discogs_release_id=553236,
            catalog_number="ABC123",
            artist="Radiohead",
            title="OK Computer",
            label="Parlophone",
            format="Vinyl, LP",
            personal_rating=5,
            released_year=1997,
            status=Release.STATUS_COLLECTION,
            folder=folder,
            date_added=date_added,
            media_condition=Release.CONDITION_VERY_GOOD_PLUS,
            sleeve_condition=Release.CONDITION_NEAR_MINT,
        )

        rows = build_export_rows(Release.objects.filter(pk=release.pk))

        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["Catalog#"], "ABC123")
        self.assertEqual(row["Artist"], "Radiohead")
        self.assertEqual(row["Title"], "OK Computer")
        self.assertEqual(row["Label"], "Parlophone")
        self.assertEqual(row["Format"], "Vinyl, LP")
        self.assertEqual(row["Rating"], "5")
        self.assertEqual(row["Released"], "1997")
        self.assertEqual(row["release_id"], "553236")
        self.assertEqual(row["CollectionFolder"], "Rock")
        self.assertEqual(row["Date Added"], "2020-05-14 10:32:01")
        self.assertEqual(row["Collection Media Condition"], "Very Good Plus (VG+)")
        self.assertEqual(row["Collection Sleeve Condition"], "Near Mint (NM or M-)")

    def test_blank_optional_fields_render_as_empty_strings(self):
        date_added = timezone.now()
        release = Release.objects.create(
            discogs_release_id=1,
            artist="A",
            title="B",
            status=Release.STATUS_COLLECTION,
            folder=None,
            date_added=date_added,
            personal_rating=None,
            released_year=None,
            media_condition=None,
            sleeve_condition=None,
        )

        rows = build_export_rows(Release.objects.filter(pk=release.pk))

        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["CollectionFolder"], "")
        self.assertEqual(row["Rating"], "")
        self.assertEqual(row["Released"], "")
        self.assertEqual(row["Collection Media Condition"], "")
        self.assertEqual(row["Collection Sleeve Condition"], "")
        self.assertEqual(row["Catalog#"], "")
        self.assertEqual(row["Label"], "")
        self.assertEqual(row["Format"], "")


class RenderCsvTests(TestCase):
    def test_header_row_matches_discogs_format(self):
        csv_text = render_csv([])
        reader = csv.reader(io.StringIO(csv_text))
        header = next(reader)
        self.assertEqual(header, EXPECTED_HEADER)

    def test_comma_in_format_round_trips_correctly(self):
        rows = [
            {
                "Catalog#": "ABC123",
                "Artist": "Radiohead",
                "Title": "OK Computer",
                "Label": "Parlophone",
                "Format": "Vinyl, LP",
                "Rating": "5",
                "Released": "1997",
                "release_id": "553236",
                "CollectionFolder": "Rock",
                "Date Added": "2020-05-14 10:32:01",
                "Collection Media Condition": "Very Good Plus (VG+)",
                "Collection Sleeve Condition": "Near Mint (NM or M-)",
            },
            {
                "Catalog#": "",
                "Artist": "Boards of Canada",
                "Title": "Music Has the Right to Children",
                "Label": "Warp",
                "Format": "12\", EP",
                "Rating": "",
                "Released": "1998",
                "release_id": "12345",
                "CollectionFolder": "",
                "Date Added": "2021-01-01 00:00:00",
                "Collection Media Condition": "",
                "Collection Sleeve Condition": "",
            },
        ]

        csv_text = render_csv(rows)
        reader = csv.DictReader(io.StringIO(csv_text))
        parsed_rows = list(reader)

        self.assertEqual(len(parsed_rows), 2)
        self.assertEqual(parsed_rows[0]["Format"], "Vinyl, LP")
        self.assertEqual(parsed_rows[1]["Format"], '12", EP')
        self.assertEqual(parsed_rows[1]["Artist"], "Boards of Canada")
        self.assertEqual(dict(parsed_rows[0]), rows[0])
        self.assertEqual(dict(parsed_rows[1]), rows[1])


class ExportCsvApiTests(APITestCase):
    def test_exports_only_collection_items_as_csv(self):
        folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        date_added = timezone.make_aware(timezone.datetime(2020, 5, 14, 10, 32, 1))
        Release.objects.create(
            discogs_release_id=553236,
            catalog_number="ABC123",
            artist="Radiohead",
            title="OK Computer",
            label="Parlophone",
            format="Vinyl, LP",
            personal_rating=5,
            released_year=1997,
            status=Release.STATUS_COLLECTION,
            folder=folder,
            date_added=date_added,
            media_condition=Release.CONDITION_VERY_GOOD_PLUS,
            sleeve_condition=Release.CONDITION_NEAR_MINT,
        )
        Release.objects.create(
            discogs_release_id=999,
            artist="Wishlist Artist",
            title="Wishlist Title",
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
        )

        response = self.client.get("/api/export/discogs-csv/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response["Content-Type"].startswith("text/csv"))
        self.assertIn("attachment", response["Content-Disposition"])

        reader = csv.DictReader(io.StringIO(response.content.decode()))
        rows = list(reader)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["Artist"], "Radiohead")
        self.assertEqual(rows[0]["Title"], "OK Computer")
