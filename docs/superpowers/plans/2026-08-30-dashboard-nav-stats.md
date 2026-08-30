# Sidebar Navigation, Dashboard, and Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Media Collection Tracker's top tab bar with a persistent sidebar (Dashboard/Collection/Wishlist/Search/Stats), and add a Dashboard landing page plus a Stats analytics page backed by new Discogs-sourced `genre`/`estimated_value`/`num_for_sale` data on `Release`.

**Architecture:** Backend additions are purely additive to the existing `Release` model and Discogs integration (same call sites already used for `country`, no new API calls). Frontend restructures `App.jsx` from a Tabs-driven single-file layout into a sidebar + page-switcher, extracting the existing inline search UI into its own page and adding two new page components that consume one new aggregation endpoint.

**Tech Stack:** Django REST Framework + SQLite (backend, unchanged); React + MUI, `@mui/x-charts` (new dependency, for Stats page charts).

**Spec:** `docs/superpowers/specs/2026-08-30-dashboard-nav-design.md` (extends `docs/superpowers/specs/2026-08-29-collection-tracker-design.md`)

## Global Constraints

- No URL routing or deep-linking is introduced — the app keeps one "active page" state model (previously driven by MUI `Tabs`, now by the sidebar), same as before.
- Search moves to its own dedicated page and is no longer visible from any other page.
- Wishlist keeps its existing name, endpoint, and behavior — unchanged.
- `estimated_value` is `null` when Discogs has no price data; it must never default to `0`, since that would misrepresent "no data" as "worthless" in any sum/aggregate.
- `genre`/`estimated_value`/`num_for_sale` are sourced entirely from Discogs responses the app already fetches (search results and the existing per-release-lookup used for cover art/country) — no new Discogs API calls are introduced anywhere in this plan.
- Search-based adds (wishlist or collection) do NOT trigger an extra release-detail lookup for `estimated_value`/`num_for_sale` — these start blank/null for search-based adds and are filled in by the `backfill_discogs_metadata` command, exactly like `country`'s existing behavior for search-based adds.
- The "cumulative value by date added" chart is explicitly labeled in its own UI as an approximation of collection growth by add-date valued at current prices — not a historical record of real market price changes.
- All existing Collection, Wishlist, and CSV import/export functionality must remain unchanged in behavior throughout this plan.

---

## Task 1: Add `genre`, `estimated_value`, `num_for_sale` fields to `Release`

**Files:**
- Modify: `backend/tracker/models.py`
- Modify: `backend/tracker/tests/test_models.py`
- Create: `backend/tracker/migrations/000X_release_genre_estimated_value_num_for_sale.py` (auto-generated)

**Interfaces:**
- Produces: `Release.genre` (`CharField`, blank-default `""`), `Release.estimated_value` (`DecimalField(max_digits=10, decimal_places=2)`, nullable), `Release.num_for_sale` (`PositiveIntegerField`, nullable). Every later task in this plan reads or writes these three fields by these exact names.

- [ ] **Step 1: Write the failing test**

Add to `backend/tracker/tests/test_models.py` (add `from decimal import Decimal` to its existing imports):

```python
    def test_new_discogs_metadata_fields_default_blank(self):
        release = Release.objects.create(
            discogs_release_id=100,
            artist="Test Artist",
            title="Test Title",
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
        )
        self.assertEqual(release.genre, "")
        self.assertIsNone(release.estimated_value)
        self.assertIsNone(release.num_for_sale)

    def test_new_discogs_metadata_fields_can_be_set(self):
        release = Release.objects.create(
            discogs_release_id=101,
            artist="Test Artist",
            title="Test Title 2",
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
            genre="Rock, Electronic",
            estimated_value=Decimal("24.99"),
            num_for_sale=7,
        )
        release.refresh_from_db()
        self.assertEqual(release.genre, "Rock, Electronic")
        self.assertEqual(release.estimated_value, Decimal("24.99"))
        self.assertEqual(release.num_for_sale, 7)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_models -v 2`
Expected: FAIL — `Release` has no attribute `genre` (or `estimated_value`/`num_for_sale`).

- [ ] **Step 3: Implement**

In `backend/tracker/models.py`, add these three fields to `Release`, immediately after the existing `country` field:

```python
    genre = models.CharField(max_length=255, blank=True, default="")
    estimated_value = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    num_for_sale = models.PositiveIntegerField(null=True, blank=True)
```

Run: `python manage.py makemigrations tracker` — generates the migration. Do not hand-write it.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_models -v 2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/models.py backend/tracker/migrations/ backend/tracker/tests/test_models.py
git commit -m "feat: add genre, estimated_value, num_for_sale fields to Release"
```

---

## Task 2: Extend `DiscogsClient` to capture genre and pricing data

**Files:**
- Modify: `backend/tracker/discogs.py`
- Modify: `backend/tracker/tests/test_discogs.py`

**Interfaces:**
- Consumes: `Release` fields from Task 1 (for type/shape reference only — this task doesn't touch models).
- Produces: `DiscogsClient.search(query)` results now each include a `"genre"` key (a list of strings, e.g. `["Rock", "Electronic"]` — kept as a raw list, matching how `"format"` is already returned as a raw list from `search()` and joined into a string later by the caller). `DiscogsClient.get_release_details(release_id)` now returns a 5-key dict: `{"cover_art_url": str, "country": str, "genre": str, "estimated_value": Decimal | None, "num_for_sale": int | None}` — `genre` here is a comma-joined STRING (not a list), since `get_release_details`'s existing consumers (Task 3's `commit_import`) write straight to model fields expecting strings, unlike `search()`'s list-based `format`/`genre` which stay lists until a later join step.

- [ ] **Step 1: Write the failing test**

Add to `backend/tracker/tests/test_discogs.py`, inside the existing `DiscogsClientSearchTests` class:

```python
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
```

Add to the existing `DiscogsClientReleaseTests` class:

```python
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
```

Add `from decimal import Decimal` to the top of `test_discogs.py`.

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_discogs -v 2`
Expected: FAIL — `KeyError: 'genre'` (search) and `KeyError: 'genre'`/wrong shape (get_release_details).

- [ ] **Step 3: Implement**

In `backend/tracker/discogs.py`, add `from decimal import Decimal` to the imports. In `search()`, add one line to the per-item dict (after the existing `"country"` line):

```python
                "genre": item.get("genre", []),
```

Replace the existing `get_release_details` method with:

```python
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
```

Note: Discogs' search-result objects use the key `genre` (singular, a list); release-detail objects use `genres` (plural, a list). This asymmetry is intentional and matches Discogs' actual API shape — do not "fix" it to be consistent between the two methods.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_discogs -v 2`
Expected: PASS. Also run `python manage.py test tracker.tests.test_views_discogs_search -v 2` to confirm the search proxy endpoint's existing tests (which mock `DiscogsClient.search`) are unaffected.

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/discogs.py backend/tracker/tests/test_discogs.py
git commit -m "feat: capture genre and pricing data from Discogs responses"
```

---

## Task 3: Extend `commit_import`'s fetch-callable contract with genre/value/num_for_sale

**This is the safety-critical task in this plan** — `commit_import` is the core CSV-import function (dedup, folder resolution, per-row Discogs lookup, "one bad row never aborts the batch" guarantee). Treat it with the same care as its prior extensions.

**Files:**
- Modify: `backend/tracker/csv_import.py`
- Modify: `backend/tracker/tests/test_csv_import.py`

**Interfaces:**
- Consumes: `DiscogsClient.get_release_details(release_id)` from Task 2, whose return dict now has 5 keys instead of 2.
- Produces: `commit_import(rows, folder_mode, fetch_release_details)` — same name and positional signature as before. The injected `fetch_release_details` callable's return dict contract grows from `{cover_art_url, country}` to `{cover_art_url, country, genre, estimated_value, num_for_sale}`. On the callable raising ANY exception, ALL FIVE of `cover_art_url`/`country`/`genre` become `""` and `estimated_value`/`num_for_sale` become `None` — the row is still created, the import never aborts. Every other property of `commit_import` (dedup-before-fetch ordering, folder resolution/caching, the returned summary dict's shape) is unchanged.

- [ ] **Step 1: Write the failing test**

In `backend/tracker/tests/test_csv_import.py`, replace the existing `fake_release_details` helper with:

```python
def fake_release_details(release_id):
    return {
        "cover_art_url": f"http://example.com/{release_id}.jpg",
        "country": "US",
        "genre": "Rock, Electronic",
        "estimated_value": Decimal("19.99"),
        "num_for_sale": 3,
    }
```

Add `from decimal import Decimal` to the top of the file.

Extend the existing `test_creates_releases_and_folders_per_folder_mode` test's assertions (after the existing `self.assertEqual(rock_release.country, "US")` line) with:

```python
        self.assertEqual(rock_release.genre, "Rock, Electronic")
        self.assertEqual(rock_release.estimated_value, Decimal("19.99"))
        self.assertEqual(rock_release.num_for_sale, 3)
```

Replace the existing `test_release_details_failure_leaves_row_created_without_url_or_country` test's body with (renaming it to reflect the fuller scope):

```python
    def test_release_details_failure_leaves_row_created_with_blank_metadata(self):
        rows = [
            {
                "Catalog#": "", "Artist": "A", "Title": "B", "Label": "", "Format": "",
                "Rating": "", "Released": "", "release_id": "1", "CollectionFolder": "Rock",
                "Date Added": "", "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "per_folder", failing_release_details)

        self.assertEqual(summary["created"], 1)
        release = Release.objects.get(discogs_release_id=1)
        self.assertEqual(release.cover_art_url, "")
        self.assertEqual(release.country, "")
        self.assertEqual(release.genre, "")
        self.assertIsNone(release.estimated_value)
        self.assertIsNone(release.num_for_sale)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_csv_import -v 2`
Expected: FAIL — `AttributeError`/`AssertionError` on `genre`/`estimated_value`/`num_for_sale` (the model fields exist from Task 1, but `commit_import` never sets them yet).

- [ ] **Step 3: Implement**

In `backend/tracker/csv_import.py`, replace the `try`/`except` block and the `Release.objects.create(...)` call inside `commit_import` with:

```python
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
```

Everything above this block in `commit_import` (the dedup check, the folder resolution branch) is unchanged — do not touch it.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_csv_import -v 2`
Expected: PASS. Then run the full suite: `python manage.py test` — confirm no regressions anywhere (this touches a function several other tests exercise indirectly via the commit endpoint).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/csv_import.py backend/tracker/tests/test_csv_import.py
git commit -m "feat: extend commit_import to capture genre and pricing data"
```

---

## Task 4: Expose genre/value/num_for_sale on serializers

**Files:**
- Modify: `backend/tracker/serializers.py`
- Modify: `backend/tracker/tests/test_views_add_release.py`

**Interfaces:**
- Consumes: `Release` fields from Task 1.
- Produces: `ReleaseSerializer` now includes `genre`, `estimated_value`, `num_for_sale` in its output (read by the frontend's Collection grid/cover-grid in Task 11, and by the Stats endpoint in Task 6). `AddToWishlistSerializer` and `AddToCollectionSerializer` both accept optional `genre` (string, blank-default `""`), `estimated_value` (decimal, optional/nullable), `num_for_sale` (integer, optional/nullable) — so a search-based add can carry through whatever the search response already has (per the Global Constraint: no extra lookup is triggered here). `MoveToCollectionSerializer` is NOT changed — it never touches these fields.

- [ ] **Step 1: Write the failing test**

Add to `backend/tracker/tests/test_views_add_release.py`, inside `AddToCollectionApiTests`:

```python
    def test_accepts_genre_and_pricing_fields(self):
        folder = Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)

        response = self.client.post(
            "/api/releases/collection/",
            {
                "discogs_release_id": 1,
                "artist": "A",
                "title": "B",
                "folder": folder.id,
                "genre": "Jazz, Fusion",
                "estimated_value": "12.50",
                "num_for_sale": 4,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=1)
        self.assertEqual(release.genre, "Jazz, Fusion")
        self.assertEqual(str(release.estimated_value), "12.50")
        self.assertEqual(release.num_for_sale, 4)

    def test_genre_and_pricing_fields_are_optional(self):
        folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)

        response = self.client.post(
            "/api/releases/collection/",
            {"discogs_release_id": 2, "artist": "A", "title": "B", "folder": folder.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=2)
        self.assertEqual(release.genre, "")
        self.assertIsNone(release.estimated_value)
        self.assertIsNone(release.num_for_sale)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_add_release -v 2`
Expected: FAIL — `AddToCollectionSerializer` rejects or ignores the unknown `genre`/`estimated_value`/`num_for_sale` fields (DRF `Serializer` silently drops fields not declared, so the release is created without them, failing the assertions).

- [ ] **Step 3: Implement**

In `backend/tracker/serializers.py`:

Add `"genre", "estimated_value", "num_for_sale"` to `ReleaseSerializer.Meta.fields`, after `"country"`:

```python
        fields = [
            "id", "discogs_release_id", "catalog_number", "artist", "title",
            "label", "format", "personal_rating", "released_year", "status",
            "folder", "date_added", "media_condition", "sleeve_condition",
            "notes", "cover_art_url", "country", "genre", "estimated_value",
            "num_for_sale",
        ]
```

Add these three fields to BOTH `AddToWishlistSerializer` and `AddToCollectionSerializer`, immediately after their existing `country` field:

```python
    genre = serializers.CharField(allow_blank=True, default="")
    estimated_value = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    num_for_sale = serializers.IntegerField(required=False, allow_null=True)
```

Do not add these fields to `MoveToCollectionSerializer`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_add_release -v 2`
Expected: PASS. Then run `python manage.py test tracker.tests.test_views_releases -v 2` to confirm `ReleaseListView`'s existing tests (which check `ReleaseSerializer` output shape indirectly) still pass.

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/serializers.py backend/tracker/tests/test_views_add_release.py
git commit -m "feat: expose genre and pricing fields on release serializers"
```

---

## Task 5: Rename and extend the backfill command

**Files:**
- Create: `backend/tracker/management/commands/backfill_discogs_metadata.py`
- Delete: `backend/tracker/management/commands/backfill_country.py`
- Create: `backend/tracker/tests/test_backfill_discogs_metadata_command.py`
- Delete: `backend/tracker/tests/test_backfill_country_command.py`

**Interfaces:**
- Consumes: `DiscogsClient.get_release_details` from Task 2.
- Produces: a Django management command runnable as `python manage.py backfill_discogs_metadata` — replaces `backfill_country` entirely (same throttled-per-release, continue-past-failure behavior, now covering `country`, `genre`, `estimated_value`, `num_for_sale` together in one pass over ALL `status=collection` releases, not just ones missing `country`).

- [ ] **Step 1: Write the failing test**

Create `backend/tracker/tests/test_backfill_discogs_metadata_command.py`:

```python
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from tracker.models import Release


class BackfillDiscogsMetadataCommandTests(TestCase):
    def setUp(self):
        self.collection_release_1 = Release.objects.create(
            discogs_release_id=1,
            artist="A",
            title="B",
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
        )
        self.collection_release_2 = Release.objects.create(
            discogs_release_id=2,
            artist="C",
            title="D",
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
        )
        self.wishlist_release = Release.objects.create(
            discogs_release_id=3,
            artist="E",
            title="F",
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
        )

    @patch("tracker.management.commands.backfill_discogs_metadata.DiscogsClient.get_release_details")
    def test_updates_all_metadata_fields_for_collection_releases(self, mock_details):
        mock_details.return_value = {
            "cover_art_url": "",
            "country": "US",
            "genre": "Rock",
            "estimated_value": Decimal("15.00"),
            "num_for_sale": 2,
        }

        call_command("backfill_discogs_metadata", stdout=StringIO())

        self.collection_release_1.refresh_from_db()
        self.assertEqual(self.collection_release_1.country, "US")
        self.assertEqual(self.collection_release_1.genre, "Rock")
        self.assertEqual(self.collection_release_1.estimated_value, Decimal("15.00"))
        self.assertEqual(self.collection_release_1.num_for_sale, 2)

    @patch("tracker.management.commands.backfill_discogs_metadata.DiscogsClient.get_release_details")
    def test_skips_wishlist_releases(self, mock_details):
        mock_details.return_value = {
            "cover_art_url": "", "country": "US", "genre": "Rock",
            "estimated_value": Decimal("15.00"), "num_for_sale": 2,
        }

        call_command("backfill_discogs_metadata", stdout=StringIO())

        self.wishlist_release.refresh_from_db()
        self.assertEqual(self.wishlist_release.country, "")
        called_ids = [call.args[0] for call in mock_details.call_args_list]
        self.assertNotIn(self.wishlist_release.discogs_release_id, called_ids)

    @patch("tracker.management.commands.backfill_discogs_metadata.DiscogsClient.get_release_details")
    def test_processes_a_release_that_already_has_a_country(self, mock_details):
        already_has_country = Release.objects.create(
            discogs_release_id=4, artist="G", title="H",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(), country="DE",
        )
        mock_details.return_value = {
            "cover_art_url": "", "country": "DE", "genre": "Jazz",
            "estimated_value": Decimal("30.00"), "num_for_sale": 1,
        }

        call_command("backfill_discogs_metadata", stdout=StringIO())

        already_has_country.refresh_from_db()
        called_ids = [call.args[0] for call in mock_details.call_args_list]
        self.assertIn(already_has_country.discogs_release_id, called_ids)
        self.assertEqual(already_has_country.genre, "Jazz")

    @patch("tracker.management.commands.backfill_discogs_metadata.DiscogsClient.get_release_details")
    def test_continues_past_a_failing_release_without_crashing(self, mock_details):
        def side_effect(release_id):
            if release_id == self.collection_release_1.discogs_release_id:
                raise RuntimeError("Discogs is down")
            return {
                "cover_art_url": "", "country": "US", "genre": "Rock",
                "estimated_value": Decimal("15.00"), "num_for_sale": 2,
            }

        mock_details.side_effect = side_effect

        call_command("backfill_discogs_metadata", stdout=StringIO())

        self.collection_release_1.refresh_from_db()
        self.collection_release_2.refresh_from_db()
        self.assertEqual(self.collection_release_1.country, "")
        self.assertEqual(self.collection_release_2.country, "US")
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_backfill_discogs_metadata_command -v 2`
Expected: FAIL — `CommandError: Unknown command: 'backfill_discogs_metadata'` (the command doesn't exist yet).

- [ ] **Step 3: Implement**

Delete `backend/tracker/management/commands/backfill_country.py` and `backend/tracker/tests/test_backfill_country_command.py` (their coverage is fully superseded by the new command and its test file).

Create `backend/tracker/management/commands/backfill_discogs_metadata.py`:

```python
from django.core.management.base import BaseCommand

from tracker.discogs import DiscogsClient
from tracker.models import Release


class Command(BaseCommand):
    help = (
        "Backfill country, genre, estimated_value, and num_for_sale for "
        "existing collection releases, via the Discogs API."
    )

    def handle(self, *args, **options):
        client = DiscogsClient()
        queryset = Release.objects.filter(status=Release.STATUS_COLLECTION)
        total = queryset.count()
        self.stdout.write(f"Backfilling Discogs metadata for {total} release(s)...")
        updated = 0
        failed = 0
        for index, release in enumerate(queryset, start=1):
            try:
                details = client.get_release_details(release.discogs_release_id)
                release.country = details.get("country", "") or release.country
                release.genre = details.get("genre", "") or release.genre
                estimated_value = details.get("estimated_value")
                if estimated_value is not None:
                    release.estimated_value = estimated_value
                num_for_sale = details.get("num_for_sale")
                if num_for_sale is not None:
                    release.num_for_sale = num_for_sale
                release.save(
                    update_fields=["country", "genre", "estimated_value", "num_for_sale"]
                )
                updated += 1
            except Exception as exc:
                failed += 1
                self.stdout.write(f"  [{index}/{total}] failed for release {release.id}: {exc}")
                continue
        self.stdout.write(
            self.style.SUCCESS(f"Done. Updated {updated}, failed {failed}, of {total}.")
        )
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_backfill_discogs_metadata_command -v 2`
Expected: PASS. Then run the full suite: `python manage.py test` — confirm the deleted `test_backfill_country_command.py` no longer runs (no leftover references) and nothing else regressed.

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/management/commands/backfill_discogs_metadata.py backend/tracker/tests/test_backfill_discogs_metadata_command.py
git rm backend/tracker/management/commands/backfill_country.py backend/tracker/tests/test_backfill_country_command.py
git commit -m "feat: rename and extend backfill command to cover all Discogs metadata"
```

---

## Task 6: `GET /api/stats/` aggregation endpoint

**Files:**
- Modify: `backend/tracker/views.py`
- Modify: `backend/tracker/urls.py`
- Test: `backend/tracker/tests/test_views_stats.py`

**Interfaces:**
- Consumes: `Release`, `ReleaseSerializer` from earlier tasks.
- Produces: `GET /api/stats/` → `200` with a JSON body:
  ```json
  {
    "collection_count": 0,
    "wishlist_count": 0,
    "total_estimated_value": "0.00" | null,
    "format_distribution": {"Vinyl": 0, "CD": 0},
    "condition_distribution": {"Very Good Plus": 0, "Not graded": 0},
    "genre_distribution": {"Rock": 0, "Unknown": 0},
    "cumulative_value_by_date_added": [{"date_added": "2020-05-14", "cumulative_value": "19.99"}],
    "recent_additions": [/* ReleaseSerializer-shaped objects, newest date_added first, max 8 */]
  }
  ```
  This single endpoint serves both the Dashboard page (Task 9, which reads `collection_count`/`wishlist_count`/`total_estimated_value`/`recent_additions`) and the Stats page (Task 10, which reads everything).

- [ ] **Step 1: Write the failing test**

Create `backend/tracker/tests/test_views_stats.py`:

```python
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release


class StatsApiTests(APITestCase):
    def setUp(self):
        self.folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        Release.objects.create(
            discogs_release_id=1, artist="A", title="OK Computer",
            status=Release.STATUS_COLLECTION, folder=self.folder,
            format="Vinyl, LP", media_condition="Very Good Plus", genre="Rock, Electronic",
            estimated_value=Decimal("20.00"),
            date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=2, artist="B", title="Kind of Blue",
            status=Release.STATUS_COLLECTION, folder=self.folder,
            format="CD", media_condition="Mint", genre="Jazz",
            estimated_value=Decimal("10.00"),
            date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=3, artist="C", title="No Genre No Value",
            status=Release.STATUS_COLLECTION, folder=self.folder,
            format="Vinyl", date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=4, artist="D", title="A Wishlist Item",
            status=Release.STATUS_WISHLIST, date_added=timezone.now(),
        )

    def test_returns_correct_counts_and_total_value(self):
        response = self.client.get("/api/stats/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["collection_count"], 3)
        self.assertEqual(response.data["wishlist_count"], 1)
        self.assertEqual(Decimal(response.data["total_estimated_value"]), Decimal("30.00"))

    def test_format_distribution_buckets_by_first_token(self):
        response = self.client.get("/api/stats/")

        self.assertEqual(response.data["format_distribution"]["Vinyl"], 2)
        self.assertEqual(response.data["format_distribution"]["CD"], 1)

    def test_condition_distribution_includes_not_graded_bucket(self):
        response = self.client.get("/api/stats/")

        self.assertEqual(response.data["condition_distribution"]["Very Good Plus"], 1)
        self.assertEqual(response.data["condition_distribution"]["Mint"], 1)
        self.assertEqual(response.data["condition_distribution"]["Not graded"], 1)

    def test_genre_distribution_splits_multi_genre_and_buckets_unknown(self):
        response = self.client.get("/api/stats/")

        self.assertEqual(response.data["genre_distribution"]["Rock"], 1)
        self.assertEqual(response.data["genre_distribution"]["Electronic"], 1)
        self.assertEqual(response.data["genre_distribution"]["Jazz"], 1)
        self.assertEqual(response.data["genre_distribution"]["Unknown"], 1)

    def test_total_estimated_value_excludes_releases_with_no_value_rather_than_treating_as_zero(self):
        Release.objects.all().delete()
        Release.objects.create(
            discogs_release_id=5, artist="E", title="No Value",
            status=Release.STATUS_COLLECTION, date_added=timezone.now(),
        )

        response = self.client.get("/api/stats/")

        self.assertIsNone(response.data["total_estimated_value"])

    def test_recent_additions_returns_at_most_eight_newest_first(self):
        response = self.client.get("/api/stats/")

        self.assertLessEqual(len(response.data["recent_additions"]), 8)
        self.assertIn("title", response.data["recent_additions"][0])
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_stats -v 2`
Expected: FAIL — 404, `/api/stats/` doesn't exist yet.

- [ ] **Step 3: Implement**

Append to `backend/tracker/views.py` (also add `from decimal import Decimal` and `from django.db.models import Sum` to its imports):

```python
from decimal import Decimal

from django.db.models import Sum


class StatsView(APIView):
    def get(self, request):
        collection_qs = Release.objects.filter(status=Release.STATUS_COLLECTION)

        collection_count = collection_qs.count()
        wishlist_count = Release.objects.filter(status=Release.STATUS_WISHLIST).count()

        total_value = collection_qs.aggregate(total=Sum("estimated_value"))["total"]

        format_distribution = {}
        for format_value in collection_qs.exclude(format="").values_list("format", flat=True):
            bucket = format_value.split(",")[0].strip() or "Unknown"
            format_distribution[bucket] = format_distribution.get(bucket, 0) + 1

        condition_distribution = {}
        for condition_value in collection_qs.values_list("media_condition", flat=True):
            bucket = condition_value or "Not graded"
            condition_distribution[bucket] = condition_distribution.get(bucket, 0) + 1

        genre_distribution = {}
        for genre_value in collection_qs.values_list("genre", flat=True):
            if not genre_value:
                genre_distribution["Unknown"] = genre_distribution.get("Unknown", 0) + 1
                continue
            for genre in genre_value.split(","):
                genre = genre.strip()
                if genre:
                    genre_distribution[genre] = genre_distribution.get(genre, 0) + 1

        cumulative_series = []
        running_total = Decimal("0")
        valued_releases = collection_qs.exclude(estimated_value=None).order_by("date_added")
        for release in valued_releases:
            running_total += release.estimated_value
            cumulative_series.append({
                "date_added": release.date_added.date().isoformat(),
                "cumulative_value": str(running_total),
            })

        recent_additions = ReleaseSerializer(
            collection_qs.order_by("-date_added")[:8], many=True
        ).data

        return Response({
            "collection_count": collection_count,
            "wishlist_count": wishlist_count,
            "total_estimated_value": str(total_value) if total_value is not None else None,
            "format_distribution": format_distribution,
            "condition_distribution": condition_distribution,
            "genre_distribution": genre_distribution,
            "cumulative_value_by_date_added": cumulative_series,
            "recent_additions": recent_additions,
        })
```

Append to `backend/tracker/urls.py` `urlpatterns`:

```python
    path("stats/", views.StatsView.as_view(), name="stats"),
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_stats -v 2`
Expected: PASS. Then run the full suite: `python manage.py test`.

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/views.py backend/tracker/urls.py backend/tracker/tests/test_views_stats.py
git commit -m "feat: add GET /api/stats/ aggregation endpoint"
```

---

## Task 7: Sidebar navigation shell (replaces the Tabs row)

**Files:**
- Create: `frontend/src/components/Sidebar.jsx`
- Create: `frontend/src/components/MobileBottomNav.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Produces: `Sidebar` exports both a default component (props: `activePage` string, `onSelectPage(value)`) and a named export `NAV_ITEMS` (array of `{value, label, icon}`) that `MobileBottomNav` imports and reuses. The five `value`s are exactly `"dashboard"`, `"collection"`, `"wishlist"`, `"search"`, `"stats"` — Tasks 8-11 and `App.jsx` all key off these exact strings. `App.jsx` now owns an `activePage` state (default `"dashboard"`) instead of the previous `tab` state, and renders whichever page component matches it.

This task also removes the inline search bar, search results, `AddToCollectionDialog`, wishlist snackbar, and their handlers from `App.jsx` — that logic moves into `SearchPage.jsx` in Task 8. `App.jsx` after this task briefly has no way to search (Task 8 restores it, on the new Search page) — this is expected mid-plan state, not a regression to fix within this task.

**Note on `CollectionTab`'s `refreshKey` prop:** the old `collectionRefreshKey` state existed to refresh the Collection grid/sidebar when an item was added via the search UI that used to sit directly above the tabs. Now that Search is a separate page, navigating from Search to Collection naturally remounts `CollectionTab` and refetches everything — no cross-page signal is needed anymore. Pass a literal `refreshKey={0}` from `App.jsx`; do not add new state for it, and do not modify `CollectionTab.jsx`/`CollectionGrid.jsx`/`FolderSidebar.jsx` in this task — their `refreshKey` prop still works exactly as before, just always receiving `0`.

- [ ] **Step 1: Create the Sidebar component**

`frontend/src/components/Sidebar.jsx`:

```jsx
import DashboardIcon from "@mui/icons-material/Dashboard";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

const SIDEBAR_WIDTH = 220;

export const NAV_ITEMS = [
  { value: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { value: "collection", label: "Collection", icon: LibraryMusicIcon },
  { value: "wishlist", label: "Wishlist", icon: FavoriteIcon },
  { value: "search", label: "Search", icon: SearchIcon },
  { value: "stats", label: "Stats", icon: BarChartIcon },
];

export default function Sidebar({ activePage, onSelectPage }) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        display: { xs: "none", md: "block" },
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
        },
      }}
    >
      <Typography variant="h6" sx={{ p: 2, fontWeight: 700 }}>
        Collection Tracker
      </Typography>
      <List sx={{ px: 1 }}>
        {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
          <ListItemButton
            key={value}
            selected={activePage === value}
            onClick={() => onSelectPage(value)}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
```

- [ ] **Step 2: Create the mobile bottom navigation**

`frontend/src/components/MobileBottomNav.jsx`:

```jsx
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";

import { NAV_ITEMS } from "./Sidebar";

export default function MobileBottomNav({ activePage, onSelectPage }) {
  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: 1,
        borderColor: "divider",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation showLabels value={activePage} onChange={(_, value) => onSelectPage(value)}>
        {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
          <BottomNavigationAction
            key={value}
            value={value}
            label={label}
            icon={<Icon fontSize="small" />}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
```

- [ ] **Step 3: Restructure App.jsx**

Replace `frontend/src/App.jsx` with:

```jsx
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import useMediaQuery from "@mui/material/useMediaQuery";

import CollectionTab from "./components/CollectionTab";
import MobileBottomNav from "./components/MobileBottomNav";
import Sidebar from "./components/Sidebar";
import WishlistTab from "./components/WishlistTab";
import { createAppTheme } from "./theme";

export default function App() {
  // Dark is the default look; only fall back to the light palette when the
  // OS explicitly prefers light. Dark preference, no preference, or an
  // unsupported media query all resolve to dark.
  const prefersLight = useMediaQuery("(prefers-color-scheme: light)");
  const theme = useMemo(
    () => createAppTheme(prefersLight ? "light" : "dark"),
    [prefersLight]
  );

  const [activePage, setActivePage] = useState("dashboard");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "100vh" }}>
        <Sidebar activePage={activePage} onSelectPage={setActivePage} />
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 2, pb: { xs: 9, md: 2 } }}>
          {activePage === "collection" && <CollectionTab refreshKey={0} />}
          {activePage === "wishlist" && <WishlistTab />}
        </Box>
        <MobileBottomNav activePage={activePage} onSelectPage={setActivePage} />
      </Box>
    </ThemeProvider>
  );
}
```

(Tasks 8-10 will add the `dashboard`/`search`/`stats` branches to this same conditional block — leave a mental placeholder, but do not write a stub branch for them now; an unmatched `activePage` value between this task and Task 9 landing simply renders an empty content area, which is fine for a mid-plan state.)

- [ ] **Step 4: Verify manually**

Run `npm run build` from `frontend/` to confirm it compiles. Start the dev server, confirm the sidebar renders with all 5 items, clicking "Collection" or "Wishlist" shows the correct existing page exactly as before, and on a narrow viewport (or browser dev tools' mobile emulation) the sidebar is hidden and the bottom navigation bar appears instead with the same 5 items.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Sidebar.jsx frontend/src/components/MobileBottomNav.jsx frontend/src/App.jsx
git commit -m "feat: replace tab bar with sidebar navigation"
```

---

## Task 8: Search page (relocate existing search UI)

**Files:**
- Create: `frontend/src/pages/SearchPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `SearchBar`, `SearchResultsList`, `AddToCollectionDialog` (all pre-existing, unmodified), `addToCollection` from `../api/releases`, `parseArtistTitle` from `../utils/discogsFormat`.
- Produces: `SearchPage` — a self-contained page component with no props, rendered when `activePage === "search"`.

- [ ] **Step 1: Create SearchPage.jsx**

`frontend/src/pages/SearchPage.jsx`:

```jsx
import { useCallback, useState } from "react";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";

import AddToCollectionDialog from "../components/AddToCollectionDialog";
import SearchBar from "../components/SearchBar";
import SearchResultsList from "../components/SearchResultsList";
import { addToCollection } from "../api/releases";
import { parseArtistTitle } from "../utils/discogsFormat";

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState([]);
  const [wishlistedMessage, setWishlistedMessage] = useState("");
  const [addToCollectionTarget, setAddToCollectionTarget] = useState(null);

  const handleResults = useCallback((results) => setSearchResults(results), []);
  const handleWishlisted = useCallback(() => setWishlistedMessage("Added to wishlist"), []);
  const handleAddToCollection = useCallback((result) => {
    setAddToCollectionTarget(result);
  }, []);

  const handleDialogSubmit = async (dialogPayload) => {
    const { artist, title } = parseArtistTitle(addToCollectionTarget.title);
    await addToCollection({
      discogs_release_id: addToCollectionTarget.id,
      artist,
      title,
      format: (addToCollectionTarget.format || []).join(", "),
      released_year: addToCollectionTarget.year || null,
      cover_art_url:
        addToCollectionTarget.cover_image || addToCollectionTarget.thumb || "",
      country: addToCollectionTarget.country || "",
      ...dialogPayload,
    });
    setAddToCollectionTarget(null);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Search
      </Typography>
      <SearchBar onResults={handleResults} />
      {searchResults.length > 0 ? (
        <SearchResultsList
          results={searchResults}
          onAddToCollection={handleAddToCollection}
          onWishlisted={handleWishlisted}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Search Discogs to add releases to your wishlist or collection.
        </Typography>
      )}
      <AddToCollectionDialog
        open={Boolean(addToCollectionTarget)}
        onClose={() => setAddToCollectionTarget(null)}
        onSubmit={handleDialogSubmit}
      />
      <Snackbar
        open={Boolean(wishlistedMessage)}
        autoHideDuration={3000}
        onClose={() => setWishlistedMessage("")}
        message={wishlistedMessage}
        ContentProps={{
          sx: (theme) => ({
            bgcolor: "background.paper",
            color: "text.primary",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: theme.shadows[6],
          }),
        }}
      />
    </Box>
  );
}
```

- [ ] **Step 2: Wire it into App.jsx**

In `frontend/src/App.jsx`, add `import SearchPage from "./pages/SearchPage";` and add `{activePage === "search" && <SearchPage />}` inside the existing content `Box`, alongside the `collection`/`wishlist` branches.

- [ ] **Step 3: Verify manually**

Run `npm run build`. Start the dev server, navigate to the Search page via the sidebar, type a query, confirm results render, click "Add to Wishlist" on a result (confirm the snackbar appears and the item lands in the Wishlist page), and click "Add to Collection" on a result (confirm the dialog opens, submitting it succeeds and the item is visible after navigating to the Collection page).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SearchPage.jsx frontend/src/App.jsx
git commit -m "feat: move search to its own dedicated page"
```

---

## Task 9: Dashboard page

**Files:**
- Create: `frontend/src/api/stats.js`
- Create: `frontend/src/pages/DashboardPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `GET /api/stats/` from Task 6.
- Produces: `getStats() -> Promise<StatsResponse>` in `src/api/stats.js` (reused by Task 10's Stats page). `DashboardPage` — self-contained, no props, rendered when `activePage === "dashboard"`.

- [ ] **Step 1: Create the stats API module**

`frontend/src/api/stats.js`:

```js
import client from "./client";

export async function getStats() {
  const response = await client.get("/stats/");
  return response.data;
}
```

- [ ] **Step 2: Create DashboardPage.jsx**

`frontend/src/pages/DashboardPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import AlbumIcon from "@mui/icons-material/Album";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { getStats } from "../api/stats";

function StatTile({ label, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 160 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700}>
        {value}
      </Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) {
    return null;
  }

  const totalValueLabel =
    stats.total_estimated_value !== null
      ? `$${Number(stats.total_estimated_value).toFixed(2)}`
      : "—";

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Dashboard
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <StatTile label="Collection" value={stats.collection_count} />
        <StatTile label="Wishlist" value={stats.wishlist_count} />
        <StatTile label="Estimated Value" value={totalValueLabel} />
      </Stack>
      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
        Recent Additions
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 2 }}>
        {stats.recent_additions.map((release) => (
          <Card key={release.id} variant="outlined" sx={{ borderRadius: 2 }}>
            {release.cover_art_url ? (
              <CardMedia
                component="img"
                image={release.cover_art_url}
                alt={`${release.artist} - ${release.title}`}
                sx={{ aspectRatio: "1 / 1", objectFit: "cover" }}
              />
            ) : (
              <Box
                sx={{
                  aspectRatio: "1 / 1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "action.hover",
                  color: "action.disabled",
                }}
              >
                <AlbumIcon sx={{ fontSize: 32 }} />
              </Box>
            )}
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap title={release.title}>
                {release.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap title={release.artist}>
                {release.artist}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Wire it into App.jsx and make it the default page**

In `frontend/src/App.jsx`, add `import DashboardPage from "./pages/DashboardPage";` and add `{activePage === "dashboard" && <DashboardPage />}` inside the content `Box` (the `activePage` state already defaults to `"dashboard"` from Task 7 — no change needed there).

- [ ] **Step 4: Verify manually**

Run `npm run build`. Start the dev server; the app should now open on the Dashboard by default, showing the three stat tiles with real numbers from the backend and a row of recent-addition cover cards (or an empty grid if the collection is empty).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/stats.js frontend/src/pages/DashboardPage.jsx frontend/src/App.jsx
git commit -m "feat: add Dashboard page"
```

---

## Task 10: Stats page (charts + relocated Import/Export panel)

**Files:**
- Modify: `frontend/package.json` / `frontend/package-lock.json` (new dependency)
- Create: `frontend/src/pages/StatsPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `getStats()` from Task 9, `CsvImportPanel` (pre-existing, unmodified) from `../components/CsvImportPanel`.
- Produces: `StatsPage` — self-contained, no props, rendered when `activePage === "stats"`. This is also where the CSV Import/Export UI now lives (it is no longer reachable any other way — there is no separate "Import" nav item).

- [ ] **Step 1: Install the charting library**

Run: `npm install @mui/x-charts` from `frontend/`.

- [ ] **Step 2: Create StatsPage.jsx**

`frontend/src/pages/StatsPage.jsx`:

```jsx
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";

import CsvImportPanel from "../components/CsvImportPanel";
import { getStats } from "../api/stats";

function distributionToChartData(distribution) {
  return Object.entries(distribution).map(([label, value], index) => ({
    id: index,
    label,
    value,
  }));
}

export default function StatsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) {
    return null;
  }

  const formatData = distributionToChartData(stats.format_distribution);
  const conditionData = distributionToChartData(stats.condition_distribution);
  const genreData = distributionToChartData(stats.genre_distribution);
  const cumulativeSeries = stats.cumulative_value_by_date_added;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Stats
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Format Distribution
          </Typography>
          <PieChart series={[{ data: formatData }]} height={220} />
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Condition Distribution
          </Typography>
          <BarChart
            xAxis={[{ scaleType: "band", data: conditionData.map((d) => d.label) }]}
            series={[{ data: conditionData.map((d) => d.value) }]}
            height={220}
          />
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Genre Distribution
          </Typography>
          <BarChart
            xAxis={[{ scaleType: "band", data: genreData.map((d) => d.label) }]}
            series={[{ data: genreData.map((d) => d.value) }]}
            height={220}
          />
        </Paper>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Cumulative Value by Date Added
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Approximates collection growth based on when items were added, valued at
          today's prices — not a historical record of actual market price changes.
        </Typography>
        <LineChart
          xAxis={[{ scaleType: "point", data: cumulativeSeries.map((point) => point.date_added) }]}
          series={[{ data: cumulativeSeries.map((point) => Number(point.cumulative_value)) }]}
          height={220}
        />
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <CsvImportPanel />
    </Box>
  );
}
```

- [ ] **Step 3: Wire it into App.jsx**

In `frontend/src/App.jsx`, add `import StatsPage from "./pages/StatsPage";` and add `{activePage === "stats" && <StatsPage />}` inside the content `Box`.

- [ ] **Step 4: Verify manually**

Run `npm run build`. Start the dev server, navigate to Stats: confirm the three distribution charts render with real data (or empty/flat charts if the collection has no matching data yet), the cumulative-value line chart renders (or is empty if no releases have a value), and the Import/Export panel below still works exactly as before — importing a CSV and exporting the collection.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/pages/StatsPage.jsx frontend/src/App.jsx
git commit -m "feat: add Stats page with charts and relocated import/export"
```

---

## Task 11: Surface estimated_value in the Collection view

**Files:**
- Modify: `frontend/src/components/CollectionGrid.jsx`
- Modify: `frontend/src/components/CollectionCoverGrid.jsx`

**Interfaces:**
- Consumes: `estimated_value` field on each release object, now present in `GET /api/releases/` responses (via `ReleaseSerializer`, Task 4) — `null` when Discogs has no price data for that release.

- [ ] **Step 1: Add a Value column to the table view**

In `frontend/src/components/CollectionGrid.jsx`, read the current `columns` array. Add a new entry after the `released_year` column:

```js
  {
    accessorKey: "estimated_value",
    header: "Value",
    cell: (info) => {
      const value = info.getValue();
      return value !== null && value !== undefined ? `$${Number(value).toFixed(2)}` : "—";
    },
  },
```

Do not change anything else in this file — the existing `flexRender(cell.column.columnDef.cell, cell.getContext())` call already used in the table body correctly picks up this new `cell` function for this column, and falls back to the default raw-value rendering for every other column exactly as before.

- [ ] **Step 2: Show value on cover-grid cards**

In `frontend/src/components/CollectionCoverGrid.jsx`, read the current card markup. Add, immediately after the existing conditional format line (the `{release.format && (...)}` block), a new conditional line:

```jsx
{release.estimated_value !== null && release.estimated_value !== undefined && (
  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
    ${Number(release.estimated_value).toFixed(2)}
  </Typography>
)}
```

Do not change anything else in this file.

- [ ] **Step 3: Verify manually**

Run `npm run build`. Start the dev server and the backend; on the Collection page, confirm the table view shows a "Value" column (showing `$X.XX` for any release that has `estimated_value` set, and `—` otherwise), and the cover-art grid view shows the value line under the format line for releases that have it, with nothing extra for releases that don't. If your database has no releases with `estimated_value` set yet, run `python manage.py backfill_discogs_metadata` first (requires a configured `DISCOGS_TOKEN`) to populate some real data to check against, or create one test release directly with `estimated_value` set via the Django shell/admin for a quick visual check.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/CollectionGrid.jsx frontend/src/components/CollectionCoverGrid.jsx
git commit -m "feat: surface estimated value in the collection grid and cover cards"
```

---
