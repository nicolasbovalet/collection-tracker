from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase


class DiscogsReleaseDetailApiTests(APITestCase):
    @patch("tracker.views.DiscogsClient.get_release_full_details")
    def test_proxies_release_details(self, mock_get_details):
        mock_get_details.return_value = {
            "id": 553236,
            "title": "OK Computer",
            "artists": ["Radiohead"],
            "year": 1997,
            "genres": ["Rock"],
            "styles": ["Alternative Rock"],
            "tracklist": [
                {"position": "1", "type": "track", "title": "Airbag", "duration": "4:44"}
            ],
        }

        response = self.client.get("/api/discogs/release/553236/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "OK Computer")
        self.assertEqual(response.data["tracklist"][0]["title"], "Airbag")
        mock_get_details.assert_called_once_with(553236)

    @patch("tracker.views.DiscogsClient.get_release_full_details")
    def test_propagates_404_from_discogs(self, mock_get_details):
        import requests

        response_mock = requests.Response()
        response_mock.status_code = 404
        mock_get_details.side_effect = requests.HTTPError(response=response_mock)

        response = self.client.get("/api/discogs/release/999999999/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
