from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase


class DiscogsSearchApiTests(APITestCase):
    def test_missing_query_returns_400(self):
        response = self.client.get("/api/discogs/search/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("tracker.views.DiscogsClient.search")
    def test_proxies_search_results(self, mock_search):
        mock_search.return_value = [
            {"id": 1, "title": "A - B", "format": ["CD"], "year": "2000",
             "thumb": "t.jpg", "cover_image": "c.jpg"}
        ]

        response = self.client.get("/api/discogs/search/", {"q": "A"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], 1)
        mock_search.assert_called_once_with("A")
