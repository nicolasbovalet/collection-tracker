from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release


class StatsApiTests(APITestCase):
    def setUp(self):
        self.folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        Release.objects.create(
            discogs_release_id=1, artist="A", title="OK Computer",
            status=Release.STATUS_COLLECTION, folder=self.folder,
            format="Vinyl, LP", media_condition="Very Good Plus", genre="Rock, Electronic",
            estimated_value=Decimal("20.00"),
            date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=2, artist="B", title="Kind of Blue",
            status=Release.STATUS_COLLECTION, folder=self.folder,
            format="CD", media_condition="Mint", genre="Jazz",
            estimated_value=Decimal("10.00"),
            date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=3, artist="C", title="No Genre No Value",
            status=Release.STATUS_COLLECTION, folder=self.folder,
            format="Vinyl", date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=4, artist="D", title="A Wishlist Item",
            status=Release.STATUS_WISHLIST, date_added=timezone.now(),
        )

    def test_returns_correct_counts_and_total_value(self):
        response = self.client.get("/api/stats/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["collection_count"], 3)
        self.assertEqual(response.data["wishlist_count"], 1)
        self.assertEqual(Decimal(response.data["total_estimated_value"]), Decimal("30.00"))

    def test_format_distribution_buckets_by_first_token(self):
        response = self.client.get("/api/stats/")

        self.assertEqual(response.data["format_distribution"]["Vinyl"], 2)
        self.assertEqual(response.data["format_distribution"]["CD"], 1)

    def test_condition_distribution_includes_not_graded_bucket(self):
        response = self.client.get("/api/stats/")

        self.assertEqual(response.data["condition_distribution"]["Very Good Plus"], 1)
        self.assertEqual(response.data["condition_distribution"]["Mint"], 1)
        self.assertEqual(response.data["condition_distribution"]["Not graded"], 1)

    def test_genre_distribution_splits_multi_genre_and_buckets_unknown(self):
        response = self.client.get("/api/stats/")

        self.assertEqual(response.data["genre_distribution"]["Rock"], 1)
        self.assertEqual(response.data["genre_distribution"]["Electronic"], 1)
        self.assertEqual(response.data["genre_distribution"]["Jazz"], 1)
        self.assertEqual(response.data["genre_distribution"]["Unknown"], 1)

    def test_total_estimated_value_excludes_releases_with_no_value_rather_than_treating_as_zero(self):
        Release.objects.all().delete()
        Release.objects.create(
            discogs_release_id=5, artist="E", title="No Value",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )

        response = self.client.get("/api/stats/")

        self.assertIsNone(response.data["total_estimated_value"])

    def test_recent_additions_returns_at_most_eight_newest_first(self):
        response = self.client.get("/api/stats/")

        self.assertLessEqual(len(response.data["recent_additions"]), 8)
        self.assertIn("title", response.data["recent_additions"][0])
