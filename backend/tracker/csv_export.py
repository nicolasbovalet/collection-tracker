import csv
import io

from .models import Release

DISCOGS_HEADER = [
    "Catalog#",
    "Artist",
    "Title",
    "Label",
    "Format",
    "Rating",
    "Released",
    "release_id",
    "CollectionFolder",
    "Date Added",
    "Collection Media Condition",
    "Collection Sleeve Condition",
]

CONDITION_ABBREVIATIONS = {
    Release.CONDITION_MINT: "Mint (M)",
    Release.CONDITION_NEAR_MINT: "Near Mint (NM or M-)",
    Release.CONDITION_VERY_GOOD_PLUS: "Very Good Plus (VG+)",
    Release.CONDITION_VERY_GOOD: "Very Good (VG)",
    Release.CONDITION_GOOD_PLUS: "Good Plus (G+)",
    Release.CONDITION_GOOD: "Good (G)",
    Release.CONDITION_FAIR: "Fair (F)",
    Release.CONDITION_POOR: "Poor (P)",
}


def unmap_condition(plain_value):
    if not plain_value:
        return ""
    return CONDITION_ABBREVIATIONS.get(plain_value, plain_value)


def build_export_rows(queryset):
    rows = []
    for release in queryset:
        rows.append(
            {
                "Catalog#": release.catalog_number or "",
                "Artist": release.artist,
                "Title": release.title,
                "Label": release.label or "",
                "Format": release.format or "",
                "Rating": "" if release.personal_rating is None else str(release.personal_rating),
                "Released": "" if release.released_year is None else str(release.released_year),
                "release_id": str(release.discogs_release_id),
                "CollectionFolder": release.folder.name if release.folder else "",
                "Date Added": release.date_added.strftime("%Y-%m-%d %H:%M:%S"),
                "Collection Media Condition": unmap_condition(release.media_condition),
                "Collection Sleeve Condition": unmap_condition(release.sleeve_condition),
            }
        )
    return rows


def render_csv(rows):
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=DISCOGS_HEADER)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buffer.getvalue()
