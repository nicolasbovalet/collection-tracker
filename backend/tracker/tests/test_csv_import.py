import io

from django.test import TestCase

from tracker.csv_import import extract_new_folder_names, parse_csv_rows
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
