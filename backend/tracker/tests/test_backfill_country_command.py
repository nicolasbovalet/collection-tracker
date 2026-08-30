from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from tracker.models import Release


class BackfillCountryCommandTests(TestCase):
    def setUp(self):
        self.collection_release_1 = Release.objects.create(
            discogs_release_id=1,
            artist="A",
            title="B",
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
            country="",
        )
        self.collection_release_2 = Release.objects.create(
            discogs_release_id=2,
            artist="C",
            title="D",
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
            country="",
        )
        self.wishlist_release = Release.objects.create(
            discogs_release_id=3,
            artist="E",
            title="F",
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
            country="",
        )
        self.already_has_country = Release.objects.create(
            discogs_release_id=4,
            artist="G",
            title="H",
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
            country="DE",
        )

    @patch("tracker.management.commands.backfill_country.DiscogsClient.get_release_details")
    def test_updates_country_for_collection_releases_missing_it(self, mock_details):
        mock_details.return_value = {"cover_art_url": "", "country": "US"}

        call_command("backfill_country", stdout=StringIO())

        self.collection_release_1.refresh_from_db()
        self.collection_release_2.refresh_from_db()
        self.assertEqual(self.collection_release_1.country, "US")
        self.assertEqual(self.collection_release_2.country, "US")

    @patch("tracker.management.commands.backfill_country.DiscogsClient.get_release_details")
    def test_skips_wishlist_releases(self, mock_details):
        mock_details.return_value = {"cover_art_url": "", "country": "US"}

        call_command("backfill_country", stdout=StringIO())

        self.wishlist_release.refresh_from_db()
        self.assertEqual(self.wishlist_release.country, "")
        called_ids = [call.args[0] for call in mock_details.call_args_list]
        self.assertNotIn(self.wishlist_release.discogs_release_id, called_ids)

    @patch("tracker.management.commands.backfill_country.DiscogsClient.get_release_details")
    def test_skips_releases_that_already_have_a_country(self, mock_details):
        mock_details.return_value = {"cover_art_url": "", "country": "US"}

        call_command("backfill_country", stdout=StringIO())

        self.already_has_country.refresh_from_db()
        self.assertEqual(self.already_has_country.country, "DE")
        called_ids = [call.args[0] for call in mock_details.call_args_list]
        self.assertNotIn(self.already_has_country.discogs_release_id, called_ids)

    @patch("tracker.management.commands.backfill_country.DiscogsClient.get_release_details")
    def test_continues_past_a_failing_release_without_crashing(self, mock_details):
        def side_effect(release_id):
            if release_id == self.collection_release_1.discogs_release_id:
                raise RuntimeError("Discogs is down")
            return {"cover_art_url": "", "country": "US"}

        mock_details.side_effect = side_effect

        call_command("backfill_country", stdout=StringIO())

        self.collection_release_1.refresh_from_db()
        self.collection_release_2.refresh_from_db()
        self.assertEqual(self.collection_release_1.country, "")
        self.assertEqual(self.collection_release_2.country, "US")
