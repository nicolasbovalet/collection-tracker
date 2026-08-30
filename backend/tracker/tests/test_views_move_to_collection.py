from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release


class MoveToCollectionApiTests(APITestCase):
    def setUp(self):
        self.folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        self.wishlist_release = Release.objects.create(
            discogs_release_id=1, artist="A", title="B",
            status=Release.STATUS_WISHLIST, date_added=timezone.now(),
        )

    def test_moves_release_to_collection(self):
        response = self.client.post(
            f"/api/releases/{self.wishlist_release.id}/move-to-collection/",
            {
                "folder": self.folder.id,
                "media_condition": "Mint",
                "sleeve_condition": "Mint",
                "notes": "Test pressing",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.wishlist_release.refresh_from_db()
        self.assertEqual(self.wishlist_release.status, Release.STATUS_COLLECTION)
        self.assertEqual(self.wishlist_release.folder, self.folder)
        self.assertEqual(self.wishlist_release.media_condition, "Mint")

    def test_returns_404_for_non_wishlist_release(self):
        collection_release = Release.objects.create(
            discogs_release_id=2, artist="C", title="D",
            status=Release.STATUS_COLLECTION, folder=self.folder, date_added=timezone.now(),
        )

        response = self.client.post(
            f"/api/releases/{collection_release.id}/move-to-collection/",
            {"folder": self.folder.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_returns_404_for_missing_release(self):
        response = self.client.post(
            "/api/releases/9999/move-to-collection/", {"folder": self.folder.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
