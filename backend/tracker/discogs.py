import time

import requests
from django.conf import settings

SEARCH_URL = "https://api.discogs.com/database/search"
RELEASE_URL = "https://api.discogs.com/releases/{release_id}"

_MIN_INTERVAL_SECONDS = 1.0  # 60 requests/min
_last_call_time = [0.0]


def _throttle():
    elapsed = time.monotonic() - _last_call_time[0]
    if elapsed < _MIN_INTERVAL_SECONDS:
        time.sleep(_MIN_INTERVAL_SECONDS - elapsed)
    _last_call_time[0] = time.monotonic()


class DiscogsClient:
    def __init__(self):
        self.token = settings.DISCOGS_TOKEN
        self.user_agent = settings.DISCOGS_USER_AGENT

    def _headers(self):
        return {
            "User-Agent": self.user_agent,
            "Authorization": f"Discogs token={self.token}",
        }

    def search(self, query):
        _throttle()
        response = requests.get(
            SEARCH_URL,
            params={"q": query, "type": "release"},
            headers=self._headers(),
            timeout=10,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        return [
            {
                "id": item.get("id"),
                "title": item.get("title", ""),
                "format": item.get("format", []),
                "year": item.get("year"),
                "thumb": item.get("thumb", ""),
                "cover_image": item.get("cover_image", ""),
            }
            for item in results
        ]

    def get_release(self, release_id):
        _throttle()
        response = requests.get(
            RELEASE_URL.format(release_id=release_id),
            headers=self._headers(),
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def get_cover_art_url(self, release_id):
        data = self.get_release(release_id)
        images = data.get("images") or []
        if images:
            return images[0].get("uri", "")
        return ""
