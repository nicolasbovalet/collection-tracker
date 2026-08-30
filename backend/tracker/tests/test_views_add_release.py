from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release


class AddToWishlistApiTests(APITestCase):
    def test_creates_wishlist_release(self):
        response = self.client.post(
            "/api/releases/wishlist/",
            {
                "discogs_release_id": 553236,
                "artist": "Radiohead",
                "title": "OK Computer",
                "format": "Vinyl, LP",
                "released_year": 1997,
                "cover_art_url": "http://example.com/c.jpg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=553236)
        self.assertEqual(release.status, Release.STATUS_WISHLIST)
        self.assertIsNone(release.folder)


class AddToCollectionApiTests(APITestCase):
    def test_creates_collection_release_with_folder_and_conditions(self):
        folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)

        response = self.client.post(
            "/api/releases/collection/",
            {
                "discogs_release_id": 553236,
                "artist": "Radiohead",
                "title": "OK Computer",
                "format": "Vinyl, LP",
                "released_year": 1997,
                "cover_art_url": "http://example.com/c.jpg",
                "folder": folder.id,
                "media_condition": "Very Good Plus",
                "sleeve_condition": "Near Mint",
                "notes": "Gatefold sleeve",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=553236)
        self.assertEqual(release.status, Release.STATUS_COLLECTION)
        self.assertEqual(release.folder, folder)
        self.assertEqual(release.media_condition, "Very Good Plus")

    def test_requires_valid_folder(self):
        response = self.client.post(
            "/api/releases/collection/",
            {
                "discogs_release_id": 1, "artist": "A", "title": "B",
                "folder": 9999,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
