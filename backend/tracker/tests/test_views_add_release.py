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
                "country": "UK",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=553236)
        self.assertEqual(release.status, Release.STATUS_WISHLIST)
        self.assertIsNone(release.folder)
        self.assertEqual(release.country, "UK")


    def test_country_defaults_to_blank_when_omitted(self):
        response = self.client.post(
            "/api/releases/wishlist/",
            {
                "discogs_release_id": 1,
                "artist": "A",
                "title": "B",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=1)
        self.assertEqual(release.country, "")


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
                "country": "UK",
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
        self.assertEqual(release.country, "UK")

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

    def test_accepts_genre_and_pricing_fields(self):
        folder = Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)

        response = self.client.post(
            "/api/releases/collection/",
            {
                "discogs_release_id": 1,
                "artist": "A",
                "title": "B",
                "folder": folder.id,
                "genre": "Jazz, Fusion",
                "estimated_value": "12.50",
                "num_for_sale": 4,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=1)
        self.assertEqual(release.genre, "Jazz, Fusion")
        self.assertEqual(str(release.estimated_value), "12.50")
        self.assertEqual(release.num_for_sale, 4)

    def test_genre_and_pricing_fields_are_optional(self):
        folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)

        response = self.client.post(
            "/api/releases/collection/",
            {"discogs_release_id": 2, "artist": "A", "title": "B", "folder": folder.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=2)
        self.assertEqual(release.genre, "")
        self.assertIsNone(release.estimated_value)
        self.assertIsNone(release.num_for_sale)
