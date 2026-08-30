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

        called_headers = mock_get.call_args.kwargs["headers"]
        self.assertEqual(called_headers["User-Agent"], "TestAgent/1.0")
        self.assertEqual(called_headers["Authorization"], "Discogs token=test-token")
        self.assertEqual(
            mock_get.call_args.kwargs["params"], {"q": "OK Computer", "type": "release"}
        )
