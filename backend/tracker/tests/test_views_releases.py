from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release


class ReleaseListApiTests(APITestCase):
    def setUp(self):
        self.rock = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        self.jazz = Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)
        Release.objects.create(
            discogs_release_id=1, artist="Radiohead", title="OK Computer",
            format="Vinyl, LP", status=Release.STATUS_COLLECTION, folder=self.rock,
            personal_rating=5, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=2, artist="Miles Davis", title="Kind of Blue",
            format="CD", status=Release.STATUS_COLLECTION, folder=self.jazz,
            personal_rating=4, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=3, artist="Aphex Twin", title="Selected Ambient Works",
            format="Vinyl, LP", status=Release.STATUS_WISHLIST, date_added=timezone.now(),
        )

    def test_filters_by_status(self):
        response = self.client.get("/api/releases/", {"status": "wishlist"})
        titles = [item["title"] for item in response.data]
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(titles, ["Selected Ambient Works"])

    def test_filters_by_folder(self):
        response = self.client.get("/api/releases/", {"folder": self.jazz.id})
        titles = [item["title"] for item in response.data]
        self.assertEqual(titles, ["Kind of Blue"])

    def test_filters_by_format_case_insensitive(self):
        response = self.client.get("/api/releases/", {"format": "vinyl"})
        titles = sorted(item["title"] for item in response.data)
        self.assertEqual(titles, ["OK Computer", "Selected Ambient Works"])

    def test_orders_by_rating_descending(self):
        response = self.client.get(
            "/api/releases/", {"status": "collection", "ordering": "-personal_rating"}
        )
        titles = [item["title"] for item in response.data]
        self.assertEqual(titles, ["OK Computer", "Kind of Blue"])
