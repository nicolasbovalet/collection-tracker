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


class ReleaseListOrderingTests(APITestCase):
    """Covers case-insensitive, "The "-stripping ordering for artist/title."""

    def setUp(self):
        # Distinct artist names chosen to prove both "The " stripping and
        # case-folding work together. Alphabetical order by stripped+lowercased
        # key should be: apple, beatles (from "The Beatles"), who (from "the who"),
        # zorn (from "Zorn").
        Release.objects.create(
            discogs_release_id=101, artist="Zorn", title="Naked City",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=102, artist="apple", title="Fruit Salad",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=103, artist="The Beatles", title="Abbey Road",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=104, artist="the who", title="Tommy",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )
        # False-positive guard: starts with "The" but not followed by a space
        # immediately after "The " boundary being a real word split — this
        # should NOT be stripped.
        Release.objects.create(
            discogs_release_id=105, artist="Theatre of Tragedy", title="Velvet Darkness",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )

    def test_artist_sort_strips_the_and_is_case_insensitive(self):
        response = self.client.get(
            "/api/releases/", {"status": "collection", "ordering": "artist"}
        )
        artists = [item["artist"] for item in response.data]
        # Expected stripped+lowercased keys: apple, beatles, theatre of tragedy,
        # who, zorn
        self.assertEqual(
            artists,
            ["apple", "The Beatles", "Theatre of Tragedy", "the who", "Zorn"],
        )

    def test_artist_sort_does_not_strip_false_positive_the(self):
        response = self.client.get(
            "/api/releases/", {"status": "collection", "ordering": "artist"}
        )
        artists = [item["artist"] for item in response.data]
        # "Theatre of Tragedy" must sort under "theatre..." (between "beatles"
        # and "who"/"zorn"), NOT get mangled into "atre of tragedy" or similar,
        # which would incorrectly place it elsewhere.
        self.assertIn("Theatre of Tragedy", artists)
        theatre_index = artists.index("Theatre of Tragedy")
        beatles_index = artists.index("The Beatles")
        who_index = artists.index("the who")
        self.assertGreater(theatre_index, beatles_index)
        self.assertLess(theatre_index, who_index)

    def test_artist_sort_descending_reverses_order(self):
        response = self.client.get(
            "/api/releases/", {"status": "collection", "ordering": "-artist"}
        )
        artists = [item["artist"] for item in response.data]
        self.assertEqual(
            artists,
            ["Zorn", "the who", "Theatre of Tragedy", "The Beatles", "apple"],
        )

    def test_title_sort_is_case_insensitive_and_does_not_strip_the(self):
        # Reuse releases with distinctly cased titles, plus one title that
        # starts with "The " to confirm titles are NOT stripped (only
        # lowercased), per spec.
        Release.objects.create(
            discogs_release_id=106, artist="Some Artist", title="Zebra",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=107, artist="Some Artist", title="apple",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=108, artist="Some Artist", title="Banana",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=109, artist="Some Artist", title="The Zero Hour",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )
        response = self.client.get(
            "/api/releases/",
            {"status": "collection", "artist": "Some Artist", "ordering": "title"},
        )
        titles = [item["title"] for item in response.data]
        # "The Zero Hour" is NOT stripped, so it sorts under "the..." which
        # lowercase-alphabetically falls after "banana" and before "zebra".
        self.assertEqual(titles, ["apple", "Banana", "The Zero Hour", "Zebra"])

    def test_released_year_ordering_unaffected(self):
        Release.objects.filter(discogs_release_id=101).update(released_year=1999)
        Release.objects.filter(discogs_release_id=102).update(released_year=1985)
        Release.objects.filter(discogs_release_id=103).update(released_year=1969)
        Release.objects.filter(discogs_release_id=104).update(released_year=1975)
        Release.objects.filter(discogs_release_id=105).update(released_year=1995)
        response = self.client.get(
            "/api/releases/", {"status": "collection", "ordering": "released_year"}
        )
        years = [item["released_year"] for item in response.data]
        self.assertEqual(years, sorted(years))

    def test_date_added_ordering_unaffected(self):
        response = self.client.get(
            "/api/releases/", {"status": "collection", "ordering": "-date_added"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        dates = [item["date_added"] for item in response.data]
        self.assertEqual(dates, sorted(dates, reverse=True))
