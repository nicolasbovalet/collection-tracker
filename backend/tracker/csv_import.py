import csv
import io


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
