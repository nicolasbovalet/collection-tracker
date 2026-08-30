from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from tracker import discogs


@override_settings(DISCOGS_TOKEN="test-token", DISCOGS_USER_AGENT="TestAgent/1.0")
class DiscogsClientSearchTests(TestCase):
    def setUp(self):
        discogs._last_call_time[0] = 0.0
        patcher = patch("tracker.discogs.time.sleep")
        self.addCleanup(patcher.stop)
        patcher.start()

    @patch("tracker.discogs.requests.get")
    def test_search_sends_auth_headers_and_parses_results(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {
                    "id": 553236,
                    "title": "Radiohead - OK Computer",
                    "format": ["Vinyl", "LP"],
                    "year": "1997",
                    "thumb": "http://example.com/thumb.jpg",
                    "cover_image": "http://example.com/cover.jpg",
                    "country": "US",
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        results = client.search("OK Computer")

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], 553236)
        self.assertEqual(results[0]["thumb"], "http://example.com/thumb.jpg")
        self.assertEqual(results[0]["country"], "US")

        called_headers = mock_get.call_args.kwargs["headers"]
        self.assertEqual(called_headers["User-Agent"], "TestAgent/1.0")
        self.assertEqual(called_headers["Authorization"], "Discogs token=test-token")
        self.assertEqual(
            mock_get.call_args.kwargs["params"], {"q": "OK Computer", "type": "release"}
        )

    @patch("tracker.discogs.requests.get")
    def test_search_defaults_country_to_empty_string_when_missing(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {
                    "id": 1,
                    "title": "Some Release",
                    "format": ["Vinyl"],
                    "year": "2000",
                    "thumb": "",
                    "cover_image": "",
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        results = client.search("Some Release")

        self.assertEqual(results[0]["country"], "")

    @patch("tracker.discogs.requests.get")
    def test_search_includes_genre_list(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {
                    "id": 1,
                    "title": "Some Release",
                    "format": ["Vinyl"],
                    "year": "2000",
                    "thumb": "",
                    "cover_image": "",
                    "country": "US",
                    "genre": ["Rock", "Pop"],
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        results = client.search("Some Release")

        self.assertEqual(results[0]["genre"], ["Rock", "Pop"])

    @patch("tracker.discogs.requests.get")
    def test_search_defaults_genre_to_empty_list_when_missing(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": [
                {"id": 1, "title": "Some Release", "format": [], "year": "2000", "thumb": "", "cover_image": ""}
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        results = client.search("Some Release")

        self.assertEqual(results[0]["genre"], [])


@override_settings(DISCOGS_TOKEN="test-token", DISCOGS_USER_AGENT="TestAgent/1.0")
class DiscogsClientReleaseTests(TestCase):
    def setUp(self):
        discogs._last_call_time[0] = 0.0
        patcher = patch("tracker.discogs.time.sleep")
        self.addCleanup(patcher.stop)
        patcher.start()

    @patch("tracker.discogs.requests.get")
    def test_get_release_returns_raw_json(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": 1, "images": [{"uri": "http://x/a.jpg"}]}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        data = client.get_release(1)

        self.assertEqual(data["id"], 1)
        self.assertIn(
            "https://api.discogs.com/releases/1", mock_get.call_args.args[0]
        )

    @patch("tracker.discogs.requests.get")
    def test_get_cover_art_url_returns_first_image(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"images": [{"uri": "http://x/a.jpg"}]}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        self.assertEqual(client.get_cover_art_url(1), "http://x/a.jpg")

    @patch("tracker.discogs.requests.get")
    def test_get_cover_art_url_returns_empty_string_when_no_images(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"images": []}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        self.assertEqual(client.get_cover_art_url(1), "")

    @patch("tracker.discogs.requests.get")
    def test_get_release_details_returns_cover_art_and_country(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "images": [{"uri": "http://x/a.jpg"}],
            "country": "US",
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        details = client.get_release_details(1)

        self.assertEqual(
            details,
            {
                "cover_art_url": "http://x/a.jpg",
                "country": "US",
                "genre": "",
                "estimated_value": None,
                "num_for_sale": None,
            }
        )

    @patch("tracker.discogs.requests.get")
    def test_get_release_details_defaults_country_when_missing(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"images": [{"uri": "http://x/a.jpg"}]}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        details = client.get_release_details(1)

        self.assertEqual(details["country"], "")

    @patch("tracker.discogs.requests.get")
    def test_get_release_details_returns_empty_cover_art_when_no_images(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"images": [], "country": "UK"}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        details = client.get_release_details(1)

        self.assertEqual(
            details,
            {
                "cover_art_url": "",
                "country": "UK",
                "genre": "",
                "estimated_value": None,
                "num_for_sale": None,
            }
        )

    @patch("tracker.discogs.requests.get")
    def test_get_release_details_includes_genre_value_and_num_for_sale(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "images": [{"uri": "http://x/a.jpg"}],
            "country": "US",
            "genres": ["Rock", "Electronic"],
            "lowest_price": 24.99,
            "num_for_sale": 7,
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        details = client.get_release_details(1)

        self.assertEqual(details["genre"], "Rock, Electronic")
        self.assertEqual(details["estimated_value"], Decimal("24.99"))
        self.assertEqual(details["num_for_sale"], 7)

    @patch("tracker.discogs.requests.get")
    def test_get_release_details_defaults_missing_metadata_to_blank_or_none(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"images": [], "country": ""}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        details = client.get_release_details(1)

        self.assertEqual(details["genre"], "")
        self.assertIsNone(details["estimated_value"])
        self.assertIsNone(details["num_for_sale"])
