from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release

SAMPLE_CSV = (
    "Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,"
    "CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition\n"
    "ABC123,Radiohead,OK Computer,Parlophone,Vinyl,5,1997,553236,"
    "Rock,2020-05-14 10:32:01,Very Good Plus (VG+),Near Mint (NM or M-)\n"
    "XYZ789,Miles Davis,Kind of Blue,Columbia,CD,4,1959,12345,"
    "Jazz,2021-01-01 00:00:00,Mint (M),Mint (M)\n"
)


def make_csv_upload():
    return SimpleUploadedFile(
        "collection.csv", SAMPLE_CSV.encode("utf-8"), content_type="text/csv"
    )


class CsvImportDryRunApiTests(APITestCase):
    def test_missing_file_returns_400(self):
        response = self.client.post("/api/import/discogs-csv/dry-run/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_returns_new_folder_names(self):
        response = self.client.post(
            "/api/import/discogs-csv/dry-run/", {"file": make_csv_upload()}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["new_folders"], ["Jazz", "Rock"])

    def test_excludes_existing_folders(self):
        Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        response = self.client.post(
            "/api/import/discogs-csv/dry-run/", {"file": make_csv_upload()}
        )
        self.assertEqual(response.data["new_folders"], ["Jazz"])


class CsvImportCommitApiTests(APITestCase):
    def test_missing_file_returns_400(self):
        response = self.client.post(
            "/api/import/discogs-csv/commit/", {"folder_mode": "per_folder"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_folder_mode_returns_400(self):
        response = self.client.post(
            "/api/import/discogs-csv/commit/",
            {"file": make_csv_upload(), "folder_mode": "bogus"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch(
        "tracker.views.DiscogsClient.get_release_details",
        return_value={"cover_art_url": "http://x/c.jpg", "country": "US"},
    )
    def test_commits_releases_and_returns_summary(self, mock_release_details):
        response = self.client.post(
            "/api/import/discogs-csv/commit/",
            {"file": make_csv_upload(), "folder_mode": "per_folder"},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created"], 2)
        self.assertEqual(Release.objects.count(), 2)
        self.assertTrue(
            Release.objects.filter(cover_art_url="http://x/c.jpg", country="US").exists()
        )
