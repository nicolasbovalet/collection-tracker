import csv
import io
from datetime import datetime

from django.utils import timezone

from .models import Release


def parse_csv_rows(file_obj):
    decoded = io.TextIOWrapper(file_obj, encoding="utf-8-sig")
    reader = csv.DictReader(decoded)
    return list(reader)


def extract_new_folder_names(rows, existing_names):
    existing = {name.strip() for name in existing_names}
    found = set()
    for row in rows:
        name = (row.get("CollectionFolder") or "").strip()
        if name and name not in existing:
            found.add(name)
    return sorted(found)


def map_condition(raw_value):
    if not raw_value:
        return None
    value = raw_value.strip()
    if not value:
        return None
    plain = value.split(" (")[0].strip()
    valid = {choice[0] for choice in Release.CONDITION_CHOICES}
    return plain if plain in valid else None


def _parse_date_added(raw_value):
    if raw_value:
        try:
            naive = datetime.strptime(raw_value.strip(), "%Y-%m-%d %H:%M:%S")
            return timezone.make_aware(naive)
        except ValueError:
            pass
    return timezone.now()


def _parse_rating(raw_value):
    if raw_value and raw_value.strip().isdigit():
        rating = int(raw_value.strip())
        if 0 <= rating <= 5:
            return rating
    return None


def _parse_year(raw_value):
    if raw_value and raw_value.strip().isdigit():
        return int(raw_value.strip())
    return None
