import time
from decimal import Decimal

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
                "country": item.get("country", ""),
                "genre": item.get("genre", []),
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

    def get_release_details(self, release_id):
        data = self.get_release(release_id)
        images = data.get("images") or []
        cover_art_url = images[0].get("uri", "") if images else ""
        country = data.get("country", "") or ""
        genre = ", ".join(data.get("genres") or [])
        lowest_price = data.get("lowest_price")
        estimated_value = Decimal(str(lowest_price)) if lowest_price is not None else None
        num_for_sale = data.get("num_for_sale")
        return {
            "cover_art_url": cover_art_url,
            "country": country,
            "genre": genre,
            "estimated_value": estimated_value,
            "num_for_sale": num_for_sale,
        }

    def get_release_full_details(self, release_id):
        data = self.get_release(release_id)
        images = data.get("images") or []
        community = data.get("community") or {}
        rating = community.get("rating") or {}
        return {
            "id": data.get("id"),
            "title": data.get("title", ""),
            "artists": [a.get("name", "") for a in (data.get("artists") or [])],
            "year": data.get("year"),
            "released": data.get("released", ""),
            "country": data.get("country", ""),
            "genres": data.get("genres") or [],
            "styles": data.get("styles") or [],
            "labels": [
                {"name": label.get("name", ""), "catno": label.get("catno", "")}
                for label in (data.get("labels") or [])
            ],
            "format": _format_summary(data.get("formats") or []),
            "notes": data.get("notes", ""),
            "tracklist": [
                {
                    "position": track.get("position", ""),
                    "type": track.get("type_", "track"),
                    "title": track.get("title", ""),
                    "duration": track.get("duration", ""),
                }
                for track in (data.get("tracklist") or [])
            ],
            "cover_art_url": images[0].get("uri", "") if images else "",
            "community_rating_average": rating.get("average"),
            "community_rating_count": rating.get("count"),
            "have": community.get("have"),
            "want": community.get("want"),
            "lowest_price": data.get("lowest_price"),
            "num_for_sale": data.get("num_for_sale"),
            "discogs_url": data.get("uri") or f"https://www.discogs.com/release/{release_id}",
        }


def _format_summary(formats):
    parts = []
    for fmt in formats:
        parts.append(fmt.get("name", ""))
        parts.extend(fmt.get("descriptions") or [])
    return ", ".join(part for part in parts if part)
