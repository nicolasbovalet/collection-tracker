import csv
import io
from datetime import datetime

from django.utils import timezone

from .models import Folder, Release


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


MAIN_FOLDER_NAME = "Main"


def commit_import(rows, folder_mode, fetch_release_details):
    folders_created = []
    folder_cache = {folder.name: folder for folder in Folder.objects.all()}

    def get_or_create_folder(name):
        if name in folder_cache:
            return folder_cache[name]
        folder = Folder.objects.create(name=name, source=Folder.SOURCE_DISCOGS_IMPORT)
        folder_cache[name] = folder
        folders_created.append(name)
        return folder

    created = 0
    skipped_duplicates = 0

    for row in rows:
        release_id_raw = (row.get("release_id") or "").strip()
        if not release_id_raw.isdigit():
            continue
        discogs_release_id = int(release_id_raw)

        already_exists = Release.objects.filter(
            discogs_release_id=discogs_release_id, status=Release.STATUS_COLLECTION
        ).exists()
        if already_exists:
            skipped_duplicates += 1
            continue

        if folder_mode == "main_only":
            folder = get_or_create_folder(MAIN_FOLDER_NAME)
        else:
            folder_name = (row.get("CollectionFolder") or "").strip() or MAIN_FOLDER_NAME
            folder = get_or_create_folder(folder_name)

        try:
            details = fetch_release_details(discogs_release_id) or {}
            cover_art_url = details.get("cover_art_url", "") or ""
            country = details.get("country", "") or ""
            genre = details.get("genre", "") or ""
            estimated_value = details.get("estimated_value")
            num_for_sale = details.get("num_for_sale")
        except Exception:
            cover_art_url = ""
            country = ""
            genre = ""
            estimated_value = None
            num_for_sale = None

        Release.objects.create(
            discogs_release_id=discogs_release_id,
            catalog_number=(row.get("Catalog#") or "").strip(),
            artist=(row.get("Artist") or "").strip(),
            title=(row.get("Title") or "").strip(),
            label=(row.get("Label") or "").strip(),
            format=(row.get("Format") or "").strip(),
            personal_rating=_parse_rating(row.get("Rating")),
            released_year=_parse_year(row.get("Released")),
            status=Release.STATUS_COLLECTION,
            folder=folder,
            date_added=_parse_date_added(row.get("Date Added")),
            media_condition=map_condition(row.get("Collection Media Condition")),
            sleeve_condition=map_condition(row.get("Collection Sleeve Condition")),
            cover_art_url=cover_art_url,
            country=country,
            genre=genre,
            estimated_value=estimated_value,
            num_for_sale=num_for_sale,
        )
        created += 1

    return {
        "created": created,
        "skipped_duplicates": skipped_duplicates,
        "folders_created": folders_created,
    }
