# Media Collection Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal Discogs-backed media collection tracker (Django REST Framework + SQLite backend, React + MUI + TanStack Table frontend), dockerized for homelab deployment behind a Cloudflare tunnel.

**Architecture:** Django REST Framework API (`backend/`) backed by SQLite, exposing Folder/Release resources plus a throttled Discogs proxy and a CSV import pipeline. A React + MUI SPA (`frontend/`) consumes the API, with TanStack Table driving the collection grid. In production, an nginx container serves the built frontend and reverse-proxies `/api/*` to the Django container; SQLite lives on a persisted volume.

**Tech Stack:** Django 5, Django REST Framework, SQLite, `requests`; React 18, MUI 5, `@tanstack/react-table`, Vite, axios; Docker + docker-compose + nginx.

**Spec:** `docs/superpowers/specs/2026-08-29-collection-tracker-design.md`

## Global Constraints

- Backend: Django REST Framework, SQLite. Frontend: React + MUI, TanStack Table for the collection grid.
- No application-level authentication — access control is network-level only (Cloudflare Access / tunnel).
- The Discogs personal access token and User-Agent live only in the backend environment (`DISCOGS_TOKEN`, `DISCOGS_USER_AGENT`) and are never sent to the frontend; all Discogs calls are proxied through the backend.
- Discogs API calls are throttled to 60 requests/min and issued one at a time (never in parallel) during CSV import.
- Condition enum, exact values in order: `Mint`, `Near Mint`, `Very Good Plus`, `Very Good`, `Good Plus`, `Good`, `Fair`, `Poor`. Used for both `media_condition` and `sleeve_condition`.
- `Release.discogs_release_id` is required (not nullable) — every Release originates from a Discogs search result or a CSV import row, both of which always carry one.
- There is no manual "add release" form anywhere in the app. All Releases originate from Discogs search or CSV import.
- CSV import commit is synchronous (the request blocks until done). Rows whose `discogs_release_id` already exists as a `status=collection` Release are skipped, not recreated or updated. A cover-art fetch failure for a row leaves `cover_art_url` blank and does not abort the row or the import.
- Deployment is docker-compose with an nginx container (serves the built frontend, reverse-proxies `/api/*` to the backend) and a backend container (gunicorn), SQLite file on a persisted volume.
- The **ui-ux-pro-max** skill must be explicitly invoked — and that invocation confirmed out loud — for the UI/UX design pass. It must never be assumed to auto-trigger.

---

## Task 1: Backend project scaffold + health check

**Files:**
- Create: `backend/manage.py`
- Create: `backend/requirements.txt`
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `backend/tracker/__init__.py`
- Create: `backend/tracker/apps.py`
- Create: `backend/tracker/views.py`
- Create: `backend/tracker/urls.py`
- Test: `backend/tracker/tests/__init__.py`
- Test: `backend/tracker/tests/test_health.py`

**Interfaces:**
- Produces: `GET /api/health/` → `{"status": "ok"}`. Later tasks add paths to `backend/tracker/urls.py` and views to `backend/tracker/views.py` alongside this one.

- [ ] **Step 1: Create the scaffold files**

`backend/requirements.txt`:
```
Django==5.0.6
djangorestframework==3.15.1
django-cors-headers==4.3.1
requests==2.31.0
gunicorn==22.0.0
```

`backend/manage.py`:
```python
#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

`backend/config/__init__.py`: empty file.

`backend/config/settings.py`:
```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-secret-key-change-in-prod")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "tracker",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173"
).split(",")

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("DJANGO_DB_PATH", BASE_DIR / "db.sqlite3"),
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "django-static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": None,
}

DISCOGS_TOKEN = os.environ.get("DISCOGS_TOKEN", "")
DISCOGS_USER_AGENT = os.environ.get(
    "DISCOGS_USER_AGENT", "CollectionTracker/1.0 +https://beauvalet.ca"
)
```

`backend/config/urls.py`:
```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("tracker.urls")),
]
```

`backend/config/wsgi.py`:
```python
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()
```

`backend/tracker/__init__.py`: empty file.

`backend/tracker/apps.py`:
```python
from django.apps import AppConfig


class TrackerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tracker"
```

`backend/tracker/urls.py`:
```python
from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
]
```

`backend/tracker/tests/__init__.py`: empty file.

- [ ] **Step 2: Write the failing test**

`backend/tracker/tests/test_health.py`:
```python
from rest_framework import status
from rest_framework.test import APITestCase


class HealthCheckTests(APITestCase):
    def test_health_returns_ok(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"status": "ok"})
```

- [ ] **Step 3: Run it to verify it fails**

Run (from `backend/`): `pip install -r requirements.txt && python manage.py test`
Expected: FAIL — `tracker.views` has no attribute `health` (it doesn't exist yet).

- [ ] **Step 4: Implement the health view**

`backend/tracker/views.py`:
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `python manage.py test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: scaffold Django backend with health check"
```

---

## Task 2: Folder model

**Files:**
- Create: `backend/tracker/models.py`
- Create: `backend/tracker/migrations/__init__.py`
- Test: `backend/tracker/tests/test_models.py`

**Interfaces:**
- Produces: `Folder` model with fields `name` (unique `CharField`), `source` (`CharField`, choices `Folder.SOURCE_DISCOGS_IMPORT = "discogs_import"` / `Folder.SOURCE_USER_CREATED = "user_created"`). Consumed by every later task that references folders.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_models.py`:
```python
from django.db import IntegrityError
from django.test import TestCase

from tracker.models import Folder


class FolderModelTests(TestCase):
    def test_create_folder(self):
        folder = Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)
        self.assertEqual(str(folder), "Jazz")

    def test_folder_name_is_unique(self):
        Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)
        with self.assertRaises(IntegrityError):
            Folder.objects.create(name="Jazz", source=Folder.SOURCE_DISCOGS_IMPORT)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_models`
Expected: FAIL — no module named `tracker.models` (or no `Folder`).

- [ ] **Step 3: Implement the model and migration**

`backend/tracker/models.py`:
```python
from django.db import models


class Folder(models.Model):
    SOURCE_DISCOGS_IMPORT = "discogs_import"
    SOURCE_USER_CREATED = "user_created"
    SOURCE_CHOICES = [
        (SOURCE_DISCOGS_IMPORT, "Discogs Import"),
        (SOURCE_USER_CREATED, "User Created"),
    ]

    name = models.CharField(max_length=255, unique=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)

    def __str__(self):
        return self.name
```

`backend/tracker/migrations/__init__.py`: empty file.

Run: `python manage.py makemigrations tracker` — this generates
`backend/tracker/migrations/0001_initial.py`. Do not hand-write it; let
Django generate it, then include the generated file in the commit.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_models`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/models.py backend/tracker/migrations/ backend/tracker/tests/test_models.py
git commit -m "feat: add Folder model"
```

---

## Task 3: Release model

**Files:**
- Modify: `backend/tracker/models.py` (append `Release`)
- Modify: `backend/tracker/tests/test_models.py` (append `ReleaseModelTests`)
- Create: `backend/tracker/migrations/0002_release.py` (generated)

**Interfaces:**
- Consumes: `Folder` from Task 2 (`tracker.models.Folder`).
- Produces: `Release` model. Status choices `Release.STATUS_WISHLIST = "wishlist"` / `Release.STATUS_COLLECTION = "collection"`. Condition choices `Release.CONDITION_CHOICES` (8 tuples, values `Mint`, `Near Mint`, `Very Good Plus`, `Very Good`, `Good Plus`, `Good`, `Fair`, `Poor`). Fields: `discogs_release_id` (required `PositiveIntegerField`), `catalog_number`, `artist`, `title`, `label`, `format`, `personal_rating` (nullable, 0–5), `released_year` (nullable), `status`, `folder` (nullable FK), `date_added` (required `DateTimeField`, no default — callers must always set it explicitly), `media_condition`, `sleeve_condition` (both nullable), `notes`, `cover_art_url`. All later tasks that create or query Releases depend on these exact names.

- [ ] **Step 1: Write the failing test**

Append to `backend/tracker/tests/test_models.py`:
```python
from django.utils import timezone

from tracker.models import Release


class ReleaseModelTests(TestCase):
    def test_create_release_minimal(self):
        release = Release.objects.create(
            discogs_release_id=123456,
            artist="Radiohead",
            title="OK Computer",
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
        )
        self.assertIsNone(release.folder)
        self.assertIsNone(release.media_condition)

    def test_release_str(self):
        release = Release.objects.create(
            discogs_release_id=1,
            artist="Boards of Canada",
            title="Music Has the Right to Children",
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
        )
        self.assertEqual(
            str(release), "Boards of Canada - Music Has the Right to Children"
        )
```

(Add `from django.utils import timezone` and `from tracker.models import Release` to the existing imports at the top of the file — `Folder` is already imported there from Task 2.)

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_models`
Expected: FAIL — no attribute `Release` on `tracker.models`.

- [ ] **Step 3: Implement the model and migration**

Append to `backend/tracker/models.py`:
```python
from django.core.validators import MaxValueValidator


class Release(models.Model):
    STATUS_WISHLIST = "wishlist"
    STATUS_COLLECTION = "collection"
    STATUS_CHOICES = [
        (STATUS_WISHLIST, "Wishlist"),
        (STATUS_COLLECTION, "Collection"),
    ]

    CONDITION_MINT = "Mint"
    CONDITION_NEAR_MINT = "Near Mint"
    CONDITION_VERY_GOOD_PLUS = "Very Good Plus"
    CONDITION_VERY_GOOD = "Very Good"
    CONDITION_GOOD_PLUS = "Good Plus"
    CONDITION_GOOD = "Good"
    CONDITION_FAIR = "Fair"
    CONDITION_POOR = "Poor"
    CONDITION_CHOICES = [
        (CONDITION_MINT, CONDITION_MINT),
        (CONDITION_NEAR_MINT, CONDITION_NEAR_MINT),
        (CONDITION_VERY_GOOD_PLUS, CONDITION_VERY_GOOD_PLUS),
        (CONDITION_VERY_GOOD, CONDITION_VERY_GOOD),
        (CONDITION_GOOD_PLUS, CONDITION_GOOD_PLUS),
        (CONDITION_GOOD, CONDITION_GOOD),
        (CONDITION_FAIR, CONDITION_FAIR),
        (CONDITION_POOR, CONDITION_POOR),
    ]

    discogs_release_id = models.PositiveIntegerField()
    catalog_number = models.CharField(max_length=100, blank=True, default="")
    artist = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    label = models.CharField(max_length=255, blank=True, default="")
    format = models.CharField(max_length=255, blank=True, default="")
    personal_rating = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MaxValueValidator(5)]
    )
    released_year = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    folder = models.ForeignKey(
        Folder, null=True, blank=True, on_delete=models.SET_NULL, related_name="releases"
    )
    date_added = models.DateTimeField()
    media_condition = models.CharField(
        max_length=20, choices=CONDITION_CHOICES, null=True, blank=True
    )
    sleeve_condition = models.CharField(
        max_length=20, choices=CONDITION_CHOICES, null=True, blank=True
    )
    notes = models.TextField(blank=True, default="")
    cover_art_url = models.URLField(blank=True, default="")

    def __str__(self):
        return f"{self.artist} - {self.title}"
```

Run: `python manage.py makemigrations tracker` — generates
`backend/tracker/migrations/0002_release.py`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_models`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/models.py backend/tracker/migrations/ backend/tracker/tests/test_models.py
git commit -m "feat: add Release model"
```

---

## Task 4: Folder API (list + create)

**Files:**
- Create: `backend/tracker/serializers.py`
- Modify: `backend/tracker/views.py` (append `FolderListCreateView`)
- Modify: `backend/tracker/urls.py` (append `folders/` route)
- Test: `backend/tracker/tests/test_views_folders.py`

**Interfaces:**
- Consumes: `Folder` from Task 2.
- Produces: `FolderSerializer` (fields `id`, `name`, `source`; `source` is read-only). `GET/POST /api/releases/` — wait, this task is folders: `GET/POST /api/folders/`. Folders created via this endpoint are always forced to `source=Folder.SOURCE_USER_CREATED` regardless of what the client sends. Later tasks (inline folder creation from the frontend) rely on this endpoint and this forced-source behavior.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_views_folders.py`:
```python
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder


class FolderApiTests(APITestCase):
    def test_list_folders_ordered_by_name(self):
        Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)

        response = self.client.get("/api/folders/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertEqual(names, ["Jazz", "Rock"])

    def test_create_folder_forces_user_created_source(self):
        response = self.client.post(
            "/api/folders/",
            {"name": "Ambient", "source": Folder.SOURCE_DISCOGS_IMPORT},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        folder = Folder.objects.get(name="Ambient")
        self.assertEqual(folder.source, Folder.SOURCE_USER_CREATED)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_folders`
Expected: FAIL — 404, `/api/folders/` doesn't exist yet.

- [ ] **Step 3: Implement the serializer, view, and route**

`backend/tracker/serializers.py`:
```python
from rest_framework import serializers

from .models import Folder


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ["id", "name", "source"]
        read_only_fields = ["source"]
```

Append to `backend/tracker/views.py`:
```python
from rest_framework import generics

from .models import Folder
from .serializers import FolderSerializer


class FolderListCreateView(generics.ListCreateAPIView):
    queryset = Folder.objects.all().order_by("name")
    serializer_class = FolderSerializer

    def perform_create(self, serializer):
        serializer.save(source=Folder.SOURCE_USER_CREATED)
```

Append to `backend/tracker/urls.py` `urlpatterns`:
```python
    path("folders/", views.FolderListCreateView.as_view(), name="folder-list-create"),
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_folders`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/serializers.py backend/tracker/views.py backend/tracker/urls.py backend/tracker/tests/test_views_folders.py
git commit -m "feat: add Folder list/create API"
```

---

## Task 5: Release list API with filtering

**Files:**
- Modify: `backend/tracker/serializers.py` (append `ReleaseSerializer`)
- Modify: `backend/tracker/views.py` (append `ReleaseListView`)
- Modify: `backend/tracker/urls.py` (append `releases/` route)
- Test: `backend/tracker/tests/test_views_releases.py`

**Interfaces:**
- Consumes: `Release`, `Folder` from Tasks 2–3.
- Produces: `ReleaseSerializer` (all Release fields, read/write). `GET /api/releases/?status=&folder=&format=&artist=&condition=&rating=&year=&ordering=`. `condition` filters `media_condition` (the condition most relevant to at-a-glance grid filtering — `sleeve_condition` isn't separately filterable in v1). `format` and `artist` are case-insensitive substring matches; `folder`, `rating`, `year` are exact matches; `ordering` is passed straight to `.order_by()` (e.g. `-personal_rating`). This is the same endpoint the Wishlist tab uses via `status=wishlist`.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_views_releases.py`:
```python
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release


class ReleaseListApiTests(APITestCase):
    def setUp(self):
        self.rock = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        self.jazz = Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)
        Release.objects.create(
            discogs_release_id=1, artist="Radiohead", title="OK Computer",
            format="Vinyl, LP", status=Release.STATUS_COLLECTION, folder=self.rock,
            personal_rating=5, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=2, artist="Miles Davis", title="Kind of Blue",
            format="CD", status=Release.STATUS_COLLECTION, folder=self.jazz,
            personal_rating=4, date_added=timezone.now(),
        )
        Release.objects.create(
            discogs_release_id=3, artist="Aphex Twin", title="Selected Ambient Works",
            format="Vinyl, LP", status=Release.STATUS_WISHLIST, date_added=timezone.now(),
        )

    def test_filters_by_status(self):
        response = self.client.get("/api/releases/", {"status": "wishlist"})
        titles = [item["title"] for item in response.data]
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(titles, ["Selected Ambient Works"])

    def test_filters_by_folder(self):
        response = self.client.get("/api/releases/", {"folder": self.jazz.id})
        titles = [item["title"] for item in response.data]
        self.assertEqual(titles, ["Kind of Blue"])

    def test_filters_by_format_case_insensitive(self):
        response = self.client.get("/api/releases/", {"format": "vinyl"})
        titles = sorted(item["title"] for item in response.data)
        self.assertEqual(titles, ["OK Computer", "Selected Ambient Works"])

    def test_orders_by_rating_descending(self):
        response = self.client.get(
            "/api/releases/", {"status": "collection", "ordering": "-personal_rating"}
        )
        titles = [item["title"] for item in response.data]
        self.assertEqual(titles, ["OK Computer", "Kind of Blue"])
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_releases`
Expected: FAIL — 404, `/api/releases/` doesn't exist yet.

- [ ] **Step 3: Implement the serializer, view, and route**

Append to `backend/tracker/serializers.py`:
```python
from .models import Release


class ReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Release
        fields = [
            "id", "discogs_release_id", "catalog_number", "artist", "title",
            "label", "format", "personal_rating", "released_year", "status",
            "folder", "date_added", "media_condition", "sleeve_condition",
            "notes", "cover_art_url",
        ]
```

Append to `backend/tracker/views.py`:
```python
from .models import Release
from .serializers import ReleaseSerializer


class ReleaseListView(generics.ListAPIView):
    serializer_class = ReleaseSerializer

    def get_queryset(self):
        queryset = Release.objects.all()
        params = self.request.query_params

        status_param = params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        folder_param = params.get("folder")
        if folder_param:
            queryset = queryset.filter(folder_id=folder_param)

        format_param = params.get("format")
        if format_param:
            queryset = queryset.filter(format__icontains=format_param)

        artist_param = params.get("artist")
        if artist_param:
            queryset = queryset.filter(artist__icontains=artist_param)

        # "condition" filters media_condition — the condition most relevant
        # to grid filtering. sleeve_condition has no separate filter in v1.
        condition_param = params.get("condition")
        if condition_param:
            queryset = queryset.filter(media_condition=condition_param)

        rating_param = params.get("rating")
        if rating_param and rating_param.isdigit():
            queryset = queryset.filter(personal_rating=int(rating_param))

        year_param = params.get("year")
        if year_param and year_param.isdigit():
            queryset = queryset.filter(released_year=int(year_param))

        ordering = params.get("ordering")
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset
```

Append to `backend/tracker/urls.py` `urlpatterns`:
```python
    path("releases/", views.ReleaseListView.as_view(), name="release-list"),
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_releases`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/serializers.py backend/tracker/views.py backend/tracker/urls.py backend/tracker/tests/test_views_releases.py
git commit -m "feat: add Release list API with filtering"
```

---

## Task 6: Discogs client — search()

**Files:**
- Create: `backend/tracker/discogs.py`
- Test: `backend/tracker/tests/test_discogs.py`

**Interfaces:**
- Consumes: `settings.DISCOGS_TOKEN`, `settings.DISCOGS_USER_AGENT` (Task 1).
- Produces: `DiscogsClient` class with `.search(query: str) -> list[dict]`, each dict shaped `{"id", "title", "format", "year", "thumb", "cover_image"}`. Also produces the module-level `_throttle()` function reused by Task 7.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_discogs.py`:
```python
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_discogs`
Expected: FAIL — no module named `tracker.discogs`.

- [ ] **Step 3: Implement the client**

`backend/tracker/discogs.py`:
```python
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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_discogs`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/discogs.py backend/tracker/tests/test_discogs.py
git commit -m "feat: add Discogs client search()"
```

---

## Task 7: Discogs client — get_release() / get_cover_art_url() with throttling

**Files:**
- Modify: `backend/tracker/discogs.py` (append `get_release`, `get_cover_art_url`)
- Modify: `backend/tracker/tests/test_discogs.py` (append tests)

**Interfaces:**
- Consumes: `_throttle()`, `DiscogsClient` from Task 6.
- Produces: `DiscogsClient.get_release(release_id: int) -> dict` (raw Discogs release JSON) and `DiscogsClient.get_cover_art_url(release_id: int) -> str` (first image's `uri`, or `""` if none). Task 12/13 (CSV import commit) call `get_cover_art_url` as the throttled cover-art fetch function.

- [ ] **Step 1: Write the failing test**

Append to `backend/tracker/tests/test_discogs.py`:
```python
@override_settings(DISCOGS_TOKEN="test-token", DISCOGS_USER_AGENT="TestAgent/1.0")
class DiscogsClientReleaseTests(TestCase):
    def setUp(self):
        discogs._last_call_time[0] = 0.0
        patcher = patch("tracker.discogs.time.sleep")
        self.addCleanup(patcher.stop)
        patcher.start()

    @patch("tracker.discogs.requests.get")
    def test_get_release_returns_raw_json(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": 1, "images": [{"uri": "http://x/a.jpg"}]}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        data = client.get_release(1)

        self.assertEqual(data["id"], 1)
        self.assertIn(
            "https://api.discogs.com/releases/1", mock_get.call_args.args[0]
        )

    @patch("tracker.discogs.requests.get")
    def test_get_cover_art_url_returns_first_image(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"images": [{"uri": "http://x/a.jpg"}]}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        self.assertEqual(client.get_cover_art_url(1), "http://x/a.jpg")

    @patch("tracker.discogs.requests.get")
    def test_get_cover_art_url_returns_empty_string_when_no_images(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"images": []}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        client = discogs.DiscogsClient()
        self.assertEqual(client.get_cover_art_url(1), "")
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_discogs`
Expected: FAIL — `DiscogsClient` has no attribute `get_release`.

- [ ] **Step 3: Implement**

Append to the `DiscogsClient` class in `backend/tracker/discogs.py`:
```python
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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_discogs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/discogs.py backend/tracker/tests/test_discogs.py
git commit -m "feat: add Discogs client get_release/get_cover_art_url"
```

---

## Task 8: Discogs search proxy endpoint

**Files:**
- Modify: `backend/tracker/views.py` (append `DiscogsSearchView`)
- Modify: `backend/tracker/urls.py` (append `discogs/search/` route)
- Test: `backend/tracker/tests/test_views_discogs_search.py`

**Interfaces:**
- Consumes: `DiscogsClient.search()` from Task 6.
- Produces: `GET /api/discogs/search/?q=...` → `{"results": [...]}` (same shape as `DiscogsClient.search()`), or `400` if `q` is missing/blank. This is the endpoint the frontend's `SearchBar` calls — the Discogs token never reaches the client because this view is the only thing that touches `DiscogsClient`.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_views_discogs_search.py`:
```python
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_discogs_search`
Expected: FAIL — 404, route doesn't exist yet.

- [ ] **Step 3: Implement**

Append to `backend/tracker/views.py`:
```python
from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response

from .discogs import DiscogsClient


class DiscogsSearchView(APIView):
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"detail": "Query parameter 'q' is required."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        client = DiscogsClient()
        results = client.search(query)
        return Response({"results": results})
```

Append to `backend/tracker/urls.py` `urlpatterns`:
```python
    path("discogs/search/", views.DiscogsSearchView.as_view(), name="discogs-search"),
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_discogs_search`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/views.py backend/tracker/urls.py backend/tracker/tests/test_views_discogs_search.py
git commit -m "feat: add Discogs search proxy endpoint"
```

---

## Task 9: CSV parsing — parse_csv_rows() and extract_new_folder_names()

**Files:**
- Create: `backend/tracker/csv_import.py`
- Test: `backend/tracker/tests/test_csv_import.py`

**Interfaces:**
- Consumes: `Folder` from Task 2 (only in tests, to prove dedup against existing names).
- Produces: `parse_csv_rows(file_obj) -> list[dict]` (each dict keyed by the CSV header row, via `csv.DictReader`; `file_obj` is a binary file-like object such as Django's `request.FILES["file"]`). `extract_new_folder_names(rows: list[dict], existing_names: Iterable[str]) -> list[str]` (sorted, distinct, non-empty `CollectionFolder` values not in `existing_names`). Task 11 (dry-run endpoint) calls both directly.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_csv_import.py`:
```python
import io

from django.test import TestCase

from tracker.csv_import import extract_new_folder_names, parse_csv_rows
from tracker.models import Folder

SAMPLE_CSV = (
    "Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,"
    "CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition\n"
    'ABC123,Radiohead,"OK Computer","Parlophone","Vinyl, LP",5,1997,553236,'
    'Rock,2020-05-14 10:32:01,"Very Good Plus (VG+)","Near Mint (NM or M-)"\n'
    ",Boards of Canada,Music Has the Right to Children,Warp,CD,,1998,12345,,"
    "2021-01-01 00:00:00,,\n"
)


class ParseCsvRowsTests(TestCase):
    def test_parses_quoted_fields_with_commas(self):
        rows = parse_csv_rows(io.BytesIO(SAMPLE_CSV.encode("utf-8")))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["Format"], "Vinyl, LP")
        self.assertEqual(rows[0]["Title"], "OK Computer")

    def test_handles_blank_optional_fields(self):
        rows = parse_csv_rows(io.BytesIO(SAMPLE_CSV.encode("utf-8")))
        self.assertEqual(rows[1]["Catalog#"], "")
        self.assertEqual(rows[1]["CollectionFolder"], "")


class ExtractNewFolderNamesTests(TestCase):
    def test_returns_distinct_non_empty_new_folders_sorted(self):
        rows = [
            {"CollectionFolder": "Rock"},
            {"CollectionFolder": "Jazz"},
            {"CollectionFolder": "Rock"},
            {"CollectionFolder": ""},
        ]
        result = extract_new_folder_names(rows, existing_names=[])
        self.assertEqual(result, ["Jazz", "Rock"])

    def test_excludes_already_existing_folders(self):
        Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        rows = [{"CollectionFolder": "Rock"}, {"CollectionFolder": "Jazz"}]
        existing = Folder.objects.values_list("name", flat=True)
        result = extract_new_folder_names(rows, existing_names=existing)
        self.assertEqual(result, ["Jazz"])
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_csv_import`
Expected: FAIL — no module named `tracker.csv_import`.

- [ ] **Step 3: Implement**

`backend/tracker/csv_import.py`:
```python
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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_csv_import`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/csv_import.py backend/tracker/tests/test_csv_import.py
git commit -m "feat: add CSV parsing and new-folder extraction"
```

---

## Task 10: Condition mapping and field parsing helpers

**Files:**
- Modify: `backend/tracker/csv_import.py` (append `map_condition`, `_parse_date_added`, `_parse_rating`, `_parse_year`)
- Modify: `backend/tracker/tests/test_csv_import.py` (append tests)

**Interfaces:**
- Consumes: `Release.CONDITION_CHOICES` from Task 3.
- Produces: `map_condition(raw_value: str | None) -> str | None` — matches the text before `" ("` (e.g. `"Very Good Plus (VG+)"` → `"Very Good Plus"`); returns `None` for blank or unrecognized input (never raises). `_parse_date_added(raw_value) -> datetime` — parses Discogs' `"%Y-%m-%d %H:%M:%S"` format into a timezone-aware datetime, defaulting to `timezone.now()` if blank or unparseable. `_parse_rating(raw_value) -> int | None` — digits only, clamped to the valid 0–5 range, else `None`. `_parse_year(raw_value) -> int | None` — digits only, else `None`. Task 12 (`commit_import`) calls all four.

- [ ] **Step 1: Write the failing test**

Append to `backend/tracker/tests/test_csv_import.py`:
```python
from django.utils import timezone

from tracker.csv_import import (
    _parse_date_added,
    _parse_rating,
    _parse_year,
    map_condition,
)


class MapConditionTests(TestCase):
    def test_maps_known_conditions(self):
        self.assertEqual(map_condition("Mint (M)"), "Mint")
        self.assertEqual(map_condition("Very Good Plus (VG+)"), "Very Good Plus")
        self.assertEqual(map_condition("Near Mint (NM or M-)"), "Near Mint")

    def test_blank_returns_none(self):
        self.assertIsNone(map_condition(""))
        self.assertIsNone(map_condition(None))

    def test_unrecognized_value_returns_none(self):
        self.assertIsNone(map_condition("Not A Real Condition (???)"))


class ParseHelperTests(TestCase):
    def test_parse_date_added_parses_discogs_format(self):
        result = _parse_date_added("2020-05-14 10:32:01")
        self.assertTrue(timezone.is_aware(result))
        self.assertEqual(result.year, 2020)
        self.assertEqual(result.month, 5)
        self.assertEqual(result.day, 14)

    def test_parse_date_added_defaults_to_now_when_blank(self):
        before = timezone.now()
        result = _parse_date_added("")
        after = timezone.now()
        self.assertTrue(before <= result <= after)

    def test_parse_rating_valid_and_invalid(self):
        self.assertEqual(_parse_rating("5"), 5)
        self.assertIsNone(_parse_rating(""))
        self.assertIsNone(_parse_rating("not-a-number"))

    def test_parse_year_valid_and_invalid(self):
        self.assertEqual(_parse_year("1997"), 1997)
        self.assertIsNone(_parse_year(""))
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_csv_import`
Expected: FAIL — no attribute `map_condition` on `tracker.csv_import`.

- [ ] **Step 3: Implement**

Append to `backend/tracker/csv_import.py` (also add `from datetime import datetime` and
`from django.utils import timezone` and `from .models import Release` to its imports):
```python
from datetime import datetime

from django.utils import timezone

from .models import Release


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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_csv_import`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/csv_import.py backend/tracker/tests/test_csv_import.py
git commit -m "feat: add condition mapping and CSV field parsing helpers"
```

---

## Task 11: CSV import dry-run endpoint

**Files:**
- Modify: `backend/tracker/views.py` (append `CsvImportDryRunView`)
- Modify: `backend/tracker/urls.py` (append `import/discogs-csv/dry-run/` route)
- Test: `backend/tracker/tests/test_views_import.py`

**Interfaces:**
- Consumes: `parse_csv_rows`, `extract_new_folder_names` from Task 9.
- Produces: `POST /api/import/discogs-csv/dry-run/` (multipart, field `file`) → `{"new_folders": [...]}`. `400` if no file is attached. Commits nothing. The frontend re-uploads the same file to the commit endpoint (Task 13) — this endpoint is fully stateless.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_views_import.py`:
```python
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder

SAMPLE_CSV = (
    "Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,"
    "CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition\n"
    "ABC123,Radiohead,OK Computer,Parlophone,Vinyl,5,1997,553236,"
    "Rock,2020-05-14 10:32:01,Very Good Plus (VG+),Near Mint (NM or M-)\n"
    "XYZ789,Miles Davis,Kind of Blue,Columbia,CD,4,1959,12345,"
    "Jazz,2021-01-01 00:00:00,Mint (M),Mint (M)\n"
)


def make_csv_upload():
    return SimpleUploadedFile(
        "collection.csv", SAMPLE_CSV.encode("utf-8"), content_type="text/csv"
    )


class CsvImportDryRunApiTests(APITestCase):
    def test_missing_file_returns_400(self):
        response = self.client.post("/api/import/discogs-csv/dry-run/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_returns_new_folder_names(self):
        response = self.client.post(
            "/api/import/discogs-csv/dry-run/", {"file": make_csv_upload()}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["new_folders"], ["Jazz", "Rock"])

    def test_excludes_existing_folders(self):
        Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        response = self.client.post(
            "/api/import/discogs-csv/dry-run/", {"file": make_csv_upload()}
        )
        self.assertEqual(response.data["new_folders"], ["Jazz"])
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_import`
Expected: FAIL — 404, route doesn't exist yet.

- [ ] **Step 3: Implement**

Append to `backend/tracker/views.py`:
```python
from .csv_import import extract_new_folder_names, parse_csv_rows


class CsvImportDryRunView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"detail": "A CSV file is required."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        rows = parse_csv_rows(uploaded_file)
        existing_names = Folder.objects.values_list("name", flat=True)
        new_folders = extract_new_folder_names(rows, existing_names)
        return Response({"new_folders": new_folders})
```

Append to `backend/tracker/urls.py` `urlpatterns`:
```python
    path(
        "import/discogs-csv/dry-run/",
        views.CsvImportDryRunView.as_view(),
        name="csv-import-dry-run",
    ),
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_import`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/views.py backend/tracker/urls.py backend/tracker/tests/test_views_import.py
git commit -m "feat: add CSV import dry-run endpoint"
```

---

## Task 12: CSV import commit logic (commit_import())

**Files:**
- Modify: `backend/tracker/csv_import.py` (append `MAIN_FOLDER_NAME`, `commit_import`)
- Modify: `backend/tracker/tests/test_csv_import.py` (append tests)

**Interfaces:**
- Consumes: `Folder`, `Release` (Tasks 2–3); `map_condition`, `_parse_date_added`, `_parse_rating`, `_parse_year` (Task 10).
- Produces: `commit_import(rows: list[dict], folder_mode: "per_folder" | "main_only", fetch_cover_art: Callable[[int], str]) -> dict` with keys `created` (int), `skipped_duplicates` (int), `folders_created` (list[str]). `fetch_cover_art` is called once per newly-created row with the row's `discogs_release_id`; any exception it raises is swallowed and that row's `cover_art_url` is left `""`. Rows whose `discogs_release_id` already exists as a `status=collection` Release are skipped and counted in `skipped_duplicates`, not touched otherwise. `MAIN_FOLDER_NAME = "Main"` is the default folder name used for blank `CollectionFolder` values and for `folder_mode="main_only"`. Task 13 (commit endpoint) calls this with `DiscogsClient.get_cover_art_url` as `fetch_cover_art`.

- [ ] **Step 1: Write the failing test**

Append to `backend/tracker/tests/test_csv_import.py`:
```python
from tracker.csv_import import commit_import
from tracker.models import Release


def fake_cover_art(release_id):
    return f"http://example.com/{release_id}.jpg"


def failing_cover_art(release_id):
    raise RuntimeError("Discogs is down")


class CommitImportTests(TestCase):
    def test_creates_releases_and_folders_per_folder_mode(self):
        rows = [
            {
                "Catalog#": "ABC123", "Artist": "Radiohead", "Title": "OK Computer",
                "Label": "Parlophone", "Format": "Vinyl, LP", "Rating": "5",
                "Released": "1997", "release_id": "553236", "CollectionFolder": "Rock",
                "Date Added": "2020-05-14 10:32:01",
                "Collection Media Condition": "Very Good Plus (VG+)",
                "Collection Sleeve Condition": "Near Mint (NM or M-)",
            },
            {
                "Catalog#": "", "Artist": "Boards of Canada", "Title": "Music Has the Right to Children",
                "Label": "Warp", "Format": "CD", "Rating": "", "Released": "1998",
                "release_id": "12345", "CollectionFolder": "", "Date Added": "2021-01-01 00:00:00",
                "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "per_folder", fake_cover_art)

        self.assertEqual(summary["created"], 2)
        self.assertEqual(summary["skipped_duplicates"], 0)
        self.assertEqual(sorted(summary["folders_created"]), ["Main", "Rock"])

        rock_release = Release.objects.get(discogs_release_id=553236)
        self.assertEqual(rock_release.folder.name, "Rock")
        self.assertEqual(rock_release.media_condition, "Very Good Plus")
        self.assertEqual(rock_release.cover_art_url, "http://example.com/553236.jpg")

        main_release = Release.objects.get(discogs_release_id=12345)
        self.assertEqual(main_release.folder.name, "Main")

    def test_main_only_mode_routes_everything_to_main(self):
        rows = [
            {
                "Catalog#": "", "Artist": "A", "Title": "B", "Label": "", "Format": "",
                "Rating": "", "Released": "", "release_id": "1", "CollectionFolder": "Rock",
                "Date Added": "", "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "main_only", fake_cover_art)

        self.assertEqual(summary["folders_created"], ["Main"])
        self.assertEqual(Release.objects.get(discogs_release_id=1).folder.name, "Main")

    def test_skips_existing_collection_duplicates(self):
        folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        Release.objects.create(
            discogs_release_id=1, artist="A", title="B", status=Release.STATUS_COLLECTION,
            folder=folder, date_added=timezone.now(),
        )
        rows = [
            {
                "Catalog#": "", "Artist": "A", "Title": "B", "Label": "", "Format": "",
                "Rating": "", "Released": "", "release_id": "1", "CollectionFolder": "Rock",
                "Date Added": "", "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "per_folder", fake_cover_art)

        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["skipped_duplicates"], 1)
        self.assertEqual(Release.objects.filter(discogs_release_id=1).count(), 1)

    def test_cover_art_failure_leaves_row_created_without_url(self):
        rows = [
            {
                "Catalog#": "", "Artist": "A", "Title": "B", "Label": "", "Format": "",
                "Rating": "", "Released": "", "release_id": "1", "CollectionFolder": "Rock",
                "Date Added": "", "Collection Media Condition": "", "Collection Sleeve Condition": "",
            },
        ]

        summary = commit_import(rows, "per_folder", failing_cover_art)

        self.assertEqual(summary["created"], 1)
        release = Release.objects.get(discogs_release_id=1)
        self.assertEqual(release.cover_art_url, "")
```

(`Folder` and `timezone` are already imported at the top of this test file from
earlier tasks.)

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_csv_import`
Expected: FAIL — no attribute `commit_import` on `tracker.csv_import`.

- [ ] **Step 3: Implement**

Append to `backend/tracker/csv_import.py` (also add `from .models import Folder` to its imports):
```python
from .models import Folder

MAIN_FOLDER_NAME = "Main"


def commit_import(rows, folder_mode, fetch_cover_art):
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
            cover_art_url = fetch_cover_art(discogs_release_id) or ""
        except Exception:
            cover_art_url = ""

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
        )
        created += 1

    return {
        "created": created,
        "skipped_duplicates": skipped_duplicates,
        "folders_created": folders_created,
    }
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_csv_import`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/csv_import.py backend/tracker/tests/test_csv_import.py
git commit -m "feat: add CSV import commit logic with dedup and folder resolution"
```

---

## Task 13: CSV import commit endpoint

**Files:**
- Modify: `backend/tracker/views.py` (append `CsvImportCommitView`)
- Modify: `backend/tracker/urls.py` (append `import/discogs-csv/commit/` route)
- Modify: `backend/tracker/tests/test_views_import.py` (append tests)

**Interfaces:**
- Consumes: `commit_import` (Task 12), `DiscogsClient.get_cover_art_url` (Task 7).
- Produces: `POST /api/import/discogs-csv/commit/` (multipart, fields `file` and `folder_mode`) → `201` with the `commit_import` summary dict. `400` if `file` is missing or `folder_mode` isn't `per_folder`/`main_only`.

- [ ] **Step 1: Write the failing test**

Append to `backend/tracker/tests/test_views_import.py`:
```python
from unittest.mock import patch

from tracker.models import Release


class CsvImportCommitApiTests(APITestCase):
    def test_missing_file_returns_400(self):
        response = self.client.post(
            "/api/import/discogs-csv/commit/", {"folder_mode": "per_folder"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_folder_mode_returns_400(self):
        response = self.client.post(
            "/api/import/discogs-csv/commit/",
            {"file": make_csv_upload(), "folder_mode": "bogus"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("tracker.views.DiscogsClient.get_cover_art_url", return_value="http://x/c.jpg")
    def test_commits_releases_and_returns_summary(self, mock_cover_art):
        response = self.client.post(
            "/api/import/discogs-csv/commit/",
            {"file": make_csv_upload(), "folder_mode": "per_folder"},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created"], 2)
        self.assertEqual(Release.objects.count(), 2)
        self.assertTrue(
            Release.objects.filter(cover_art_url="http://x/c.jpg").exists()
        )
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_import`
Expected: FAIL — 404, route doesn't exist yet.

- [ ] **Step 3: Implement**

Append to `backend/tracker/views.py`:
```python
from .csv_import import commit_import


class CsvImportCommitView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        folder_mode = request.data.get("folder_mode", "per_folder")
        if not uploaded_file:
            return Response(
                {"detail": "A CSV file is required."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        if folder_mode not in ("per_folder", "main_only"):
            return Response(
                {"detail": "folder_mode must be 'per_folder' or 'main_only'."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        rows = parse_csv_rows(uploaded_file)
        client = DiscogsClient()
        summary = commit_import(rows, folder_mode, client.get_cover_art_url)
        return Response(summary, status=drf_status.HTTP_201_CREATED)
```

Append to `backend/tracker/urls.py` `urlpatterns`:
```python
    path(
        "import/discogs-csv/commit/",
        views.CsvImportCommitView.as_view(),
        name="csv-import-commit",
    ),
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_import`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/views.py backend/tracker/urls.py backend/tracker/tests/test_views_import.py
git commit -m "feat: add CSV import commit endpoint"
```

---

## Task 14: Add-to-wishlist and add-to-collection endpoints

**Files:**
- Modify: `backend/tracker/serializers.py` (append `AddToWishlistSerializer`, `AddToCollectionSerializer`)
- Modify: `backend/tracker/views.py` (append `AddToWishlistView`, `AddToCollectionView`)
- Modify: `backend/tracker/urls.py` (append `releases/wishlist/` and `releases/collection/` routes)
- Test: `backend/tracker/tests/test_views_add_release.py`

**Interfaces:**
- Consumes: `Release`, `Folder` from Tasks 2–3; `ReleaseSerializer` from Task 5.
- Produces: `POST /api/releases/wishlist/` (body: `discogs_release_id`, `artist`, `title`, `format`, `released_year`, `cover_art_url`) → `201` with the created Release (`ReleaseSerializer` shape), `status=wishlist`, `date_added=now`. `POST /api/releases/collection/` (body: same fields plus `folder` (id), `media_condition`, `sleeve_condition`, `notes`) → `201` with the created Release, `status=collection`, `date_added=now`. This is what the frontend's search-result "Add to Wishlist" / "Add to Collection" actions call.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_views_add_release.py`:
```python
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release


class AddToWishlistApiTests(APITestCase):
    def test_creates_wishlist_release(self):
        response = self.client.post(
            "/api/releases/wishlist/",
            {
                "discogs_release_id": 553236,
                "artist": "Radiohead",
                "title": "OK Computer",
                "format": "Vinyl, LP",
                "released_year": 1997,
                "cover_art_url": "http://example.com/c.jpg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=553236)
        self.assertEqual(release.status, Release.STATUS_WISHLIST)
        self.assertIsNone(release.folder)


class AddToCollectionApiTests(APITestCase):
    def test_creates_collection_release_with_folder_and_conditions(self):
        folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)

        response = self.client.post(
            "/api/releases/collection/",
            {
                "discogs_release_id": 553236,
                "artist": "Radiohead",
                "title": "OK Computer",
                "format": "Vinyl, LP",
                "released_year": 1997,
                "cover_art_url": "http://example.com/c.jpg",
                "folder": folder.id,
                "media_condition": "Very Good Plus",
                "sleeve_condition": "Near Mint",
                "notes": "Gatefold sleeve",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        release = Release.objects.get(discogs_release_id=553236)
        self.assertEqual(release.status, Release.STATUS_COLLECTION)
        self.assertEqual(release.folder, folder)
        self.assertEqual(release.media_condition, "Very Good Plus")

    def test_requires_valid_folder(self):
        response = self.client.post(
            "/api/releases/collection/",
            {
                "discogs_release_id": 1, "artist": "A", "title": "B",
                "folder": 9999,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_add_release`
Expected: FAIL — 404, routes don't exist yet.

- [ ] **Step 3: Implement**

Append to `backend/tracker/serializers.py` (also add `from django.utils import timezone` to its
imports):
```python
from django.utils import timezone

from .models import Folder, Release


class AddToWishlistSerializer(serializers.Serializer):
    discogs_release_id = serializers.IntegerField()
    artist = serializers.CharField(allow_blank=True, default="")
    title = serializers.CharField(allow_blank=True, default="")
    format = serializers.CharField(allow_blank=True, default="")
    released_year = serializers.IntegerField(required=False, allow_null=True)
    cover_art_url = serializers.CharField(allow_blank=True, default="")

    def create(self, validated_data):
        return Release.objects.create(
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
            **validated_data,
        )


class AddToCollectionSerializer(serializers.Serializer):
    discogs_release_id = serializers.IntegerField()
    artist = serializers.CharField(allow_blank=True, default="")
    title = serializers.CharField(allow_blank=True, default="")
    format = serializers.CharField(allow_blank=True, default="")
    released_year = serializers.IntegerField(required=False, allow_null=True)
    cover_art_url = serializers.CharField(allow_blank=True, default="")
    folder = serializers.PrimaryKeyRelatedField(queryset=Folder.objects.all())
    media_condition = serializers.ChoiceField(
        choices=Release.CONDITION_CHOICES, required=False, allow_null=True
    )
    sleeve_condition = serializers.ChoiceField(
        choices=Release.CONDITION_CHOICES, required=False, allow_null=True
    )
    notes = serializers.CharField(allow_blank=True, default="")

    def create(self, validated_data):
        return Release.objects.create(
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
            **validated_data,
        )
```

Append to `backend/tracker/views.py`:
```python
from .serializers import AddToCollectionSerializer, AddToWishlistSerializer


class AddToWishlistView(APIView):
    def post(self, request):
        serializer = AddToWishlistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        release = serializer.save()
        return Response(ReleaseSerializer(release).data, status=drf_status.HTTP_201_CREATED)


class AddToCollectionView(APIView):
    def post(self, request):
        serializer = AddToCollectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        release = serializer.save()
        return Response(ReleaseSerializer(release).data, status=drf_status.HTTP_201_CREATED)
```

Append to `backend/tracker/urls.py` `urlpatterns`:
```python
    path("releases/wishlist/", views.AddToWishlistView.as_view(), name="release-add-wishlist"),
    path("releases/collection/", views.AddToCollectionView.as_view(), name="release-add-collection"),
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_add_release`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tracker/serializers.py backend/tracker/views.py backend/tracker/urls.py backend/tracker/tests/test_views_add_release.py
git commit -m "feat: add wishlist and collection creation endpoints"
```

---

## Task 15: Move-to-collection endpoint

**Files:**
- Modify: `backend/tracker/serializers.py` (append `MoveToCollectionSerializer`)
- Modify: `backend/tracker/views.py` (append `MoveToCollectionView`)
- Modify: `backend/tracker/urls.py` (append `releases/<int:pk>/move-to-collection/` route)
- Test: `backend/tracker/tests/test_views_move_to_collection.py`

**Interfaces:**
- Consumes: `Release`, `Folder` (Tasks 2–3); `ReleaseSerializer` (Task 5).
- Produces: `POST /api/releases/{id}/move-to-collection/` (body: `folder`, `media_condition`, `sleeve_condition`, `notes`) → `200` with the updated Release, `status` flipped to `collection`. `404` if the release doesn't exist or isn't currently `status=wishlist`. This closes out the backend — the Wishlist tab's "Move to Collection" action calls this endpoint.

- [ ] **Step 1: Write the failing test**

`backend/tracker/tests/test_views_move_to_collection.py`:
```python
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder, Release


class MoveToCollectionApiTests(APITestCase):
    def setUp(self):
        self.folder = Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        self.wishlist_release = Release.objects.create(
            discogs_release_id=1, artist="A", title="B",
            status=Release.STATUS_WISHLIST, date_added=timezone.now(),
        )

    def test_moves_release_to_collection(self):
        response = self.client.post(
            f"/api/releases/{self.wishlist_release.id}/move-to-collection/",
            {
                "folder": self.folder.id,
                "media_condition": "Mint",
                "sleeve_condition": "Mint",
                "notes": "Test pressing",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.wishlist_release.refresh_from_db()
        self.assertEqual(self.wishlist_release.status, Release.STATUS_COLLECTION)
        self.assertEqual(self.wishlist_release.folder, self.folder)
        self.assertEqual(self.wishlist_release.media_condition, "Mint")

    def test_returns_404_for_non_wishlist_release(self):
        collection_release = Release.objects.create(
            discogs_release_id=2, artist="C", title="D",
            status=Release.STATUS_COLLECTION, folder=self.folder, date_added=timezone.now(),
        )

        response = self.client.post(
            f"/api/releases/{collection_release.id}/move-to-collection/",
            {"folder": self.folder.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_returns_404_for_missing_release(self):
        response = self.client.post(
            "/api/releases/9999/move-to-collection/", {"folder": self.folder.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python manage.py test tracker.tests.test_views_move_to_collection`
Expected: FAIL — 404 route doesn't exist (test itself expects 404 in two cases, but the
route-not-found 404 happens for the success case too, at the wrong URL — confirm by
running: the success-case test will fail because status stays `wishlist`/response is
Django's plain 404 page, not JSON).

- [ ] **Step 3: Implement**

Append to `backend/tracker/serializers.py`:
```python
class MoveToCollectionSerializer(serializers.Serializer):
    folder = serializers.PrimaryKeyRelatedField(queryset=Folder.objects.all())
    media_condition = serializers.ChoiceField(
        choices=Release.CONDITION_CHOICES, required=False, allow_null=True
    )
    sleeve_condition = serializers.ChoiceField(
        choices=Release.CONDITION_CHOICES, required=False, allow_null=True
    )
    notes = serializers.CharField(allow_blank=True, default="")
```

Append to `backend/tracker/views.py` (also add `from django.shortcuts import get_object_or_404`
to its imports):
```python
from django.shortcuts import get_object_or_404

from .serializers import MoveToCollectionSerializer


class MoveToCollectionView(APIView):
    def post(self, request, pk):
        release = get_object_or_404(Release, pk=pk, status=Release.STATUS_WISHLIST)
        serializer = MoveToCollectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(release, field, value)
        release.status = Release.STATUS_COLLECTION
        release.save()
        return Response(ReleaseSerializer(release).data)
```

Append to `backend/tracker/urls.py` `urlpatterns`:
```python
    path(
        "releases/<int:pk>/move-to-collection/",
        views.MoveToCollectionView.as_view(),
        name="release-move-to-collection",
    ),
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `python manage.py test tracker.tests.test_views_move_to_collection`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full backend test suite**

Run: `python manage.py test`
Expected: PASS, all tests across all modules. This is the last backend task — the API
surface is complete and fully covered.

- [ ] **Step 6: Commit**

```bash
git add backend/tracker/serializers.py backend/tracker/views.py backend/tracker/urls.py backend/tracker/tests/test_views_move_to_collection.py
git commit -m "feat: add move-to-collection endpoint"
```

---

## Task 16: Frontend scaffold (Vite + React + MUI + tab shell)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/api/client.js`

**Interfaces:**
- Produces: `frontend/src/api/client.js` exporting a default axios instance with `baseURL: "/api"` — every later `src/api/*.js` module imports this. `App.jsx` renders an MUI `Tabs` shell with three tabs: `collection`, `wishlist`, `import`, whose content later tasks replace one at a time.

There is no automated test for this task (per the spec, frontend correctness is
verified manually against a running dev server, not via automated tests).

- [ ] **Step 1: Create the scaffold files**

`frontend/package.json`:
```json
{
  "name": "collection-tracker-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@emotion/react": "^11.11.4",
    "@emotion/styled": "^11.11.5",
    "@mui/icons-material": "^5.15.20",
    "@mui/material": "^5.15.20",
    "@tanstack/react-table": "^8.19.2",
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.1"
  }
}
```

`frontend/vite.config.js`:
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
```

`frontend/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Collection Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`frontend/src/main.jsx`:
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);
```

`frontend/src/api/client.js`:
```js
import axios from "axios";

const client = axios.create({ baseURL: "/api" });

export default client;
```

`frontend/src/App.jsx`:
```jsx
import { useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

export default function App() {
  const [tab, setTab] = useState("collection");

  return (
    <Box>
      <Typography variant="h5" sx={{ p: 2 }}>
        Collection Tracker
      </Typography>
      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        <Tab label="Collection" value="collection" />
        <Tab label="Wishlist" value="wishlist" />
        <Tab label="Import" value="import" />
      </Tabs>
      <Box sx={{ p: 2 }}>
        {tab === "collection" && <Typography>Collection view coming soon.</Typography>}
        {tab === "wishlist" && <Typography>Wishlist view coming soon.</Typography>}
        {tab === "import" && <Typography>Import view coming soon.</Typography>}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Install dependencies and start the dev server**

Run (from `frontend/`): `npm install && npm run dev`

- [ ] **Step 3: Verify manually**

Open the printed local URL (typically `http://localhost:5173`) in a browser.
Expected: page shows "Collection Tracker", three tabs ("Collection", "Wishlist",
"Import"), and clicking each tab swaps the placeholder text below. No console errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/vite.config.js frontend/index.html frontend/src/
git commit -m "feat: scaffold React frontend with MUI tab shell"
```

---

## Task 17: Folders API + FolderSidebar + CollectionTab shell

**Files:**
- Create: `frontend/src/api/folders.js`
- Create: `frontend/src/components/FolderSidebar.jsx`
- Create: `frontend/src/components/CollectionTab.jsx`
- Modify: `frontend/src/App.jsx` (render `CollectionTab` in the collection tab)

**Interfaces:**
- Consumes: `client` from Task 16; backend `GET/POST /api/folders/` from Task 4.
- Produces: `getFolders() -> Promise<Array<{id, name, source}>>`, `createFolder(name: string) -> Promise<{id, name, source}>` (both in `src/api/folders.js` — Task 20's `AddToCollectionDialog` reuses both). `FolderSidebar` props: `selectedFolderId` (number | null), `onSelectFolder` (fn). `CollectionTab` owns `selectedFolderId` state and lays out the sidebar next to a grid area (grid itself arrives in Task 18).

- [ ] **Step 1: Implement the API module**

`frontend/src/api/folders.js`:
```js
import client from "./client";

export async function getFolders() {
  const response = await client.get("/folders/");
  return response.data;
}

export async function createFolder(name) {
  const response = await client.post("/folders/", { name });
  return response.data;
}
```

- [ ] **Step 2: Implement FolderSidebar**

`frontend/src/components/FolderSidebar.jsx`:
```jsx
import { useEffect, useState } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

import { getFolders } from "../api/folders";

export default function FolderSidebar({ selectedFolderId, onSelectFolder }) {
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    getFolders().then(setFolders);
  }, []);

  return (
    <List>
      <ListItemButton
        selected={selectedFolderId === null}
        onClick={() => onSelectFolder(null)}
      >
        <ListItemText primary="All Folders" />
      </ListItemButton>
      {folders.map((folder) => (
        <ListItemButton
          key={folder.id}
          selected={selectedFolderId === folder.id}
          onClick={() => onSelectFolder(folder.id)}
        >
          <ListItemText primary={folder.name} />
        </ListItemButton>
      ))}
    </List>
  );
}
```

- [ ] **Step 3: Implement CollectionTab and wire it into App**

`frontend/src/components/CollectionTab.jsx`:
```jsx
import { useState } from "react";
import Box from "@mui/material/Box";

import FolderSidebar from "./FolderSidebar";

export default function CollectionTab() {
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <Box sx={{ width: 220 }}>
        <FolderSidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
        />
      </Box>
      <Box sx={{ flexGrow: 1 }}>Grid coming soon.</Box>
    </Box>
  );
}
```

In `frontend/src/App.jsx`: add `import CollectionTab from "./components/CollectionTab";`
and replace `{tab === "collection" && <Typography>Collection view coming soon.</Typography>}`
with `{tab === "collection" && <CollectionTab />}`.

- [ ] **Step 4: Verify manually**

With the backend running (`python manage.py runserver` from `backend/`) and the
frontend dev server running, create a folder via:
```bash
curl -X POST http://localhost:8000/api/folders/ -H "Content-Type: application/json" -d '{"name":"Rock"}'
```
Refresh the frontend's Collection tab. Expected: "All Folders" and "Rock" appear in the
sidebar; clicking each highlights it (no filtering behavior yet — that's Task 18).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/folders.js frontend/src/components/FolderSidebar.jsx frontend/src/components/CollectionTab.jsx frontend/src/App.jsx
git commit -m "feat: add folder sidebar to collection tab"
```

---

## Task 18: Releases API + CollectionGrid (TanStack Table)

**Files:**
- Create: `frontend/src/api/releases.js`
- Create: `frontend/src/components/CollectionGrid.jsx`
- Modify: `frontend/src/components/CollectionTab.jsx` (render `CollectionGrid` instead of the placeholder)

**Interfaces:**
- Consumes: `client` from Task 16; backend `GET /api/releases/` from Task 5.
- Produces: `src/api/releases.js` exports `getReleases(params = {}) -> Promise<Array<Release>>`, `addToWishlist(payload) -> Promise<Release>`, `addToCollection(payload) -> Promise<Release>`, `moveToCollection(id, payload) -> Promise<Release>` (the latter three are wired up by Tasks 19–21, but defined here as one cohesive API module). `CollectionGrid` props: `folderId` (number | null), `refreshKey` (any — Task 20 bumps this to force a refetch after an add).

- [ ] **Step 1: Implement the API module**

`frontend/src/api/releases.js`:
```js
import client from "./client";

export async function getReleases(params = {}) {
  const response = await client.get("/releases/", { params });
  return response.data;
}

export async function addToWishlist(payload) {
  const response = await client.post("/releases/wishlist/", payload);
  return response.data;
}

export async function addToCollection(payload) {
  const response = await client.post("/releases/collection/", payload);
  return response.data;
}

export async function moveToCollection(id, payload) {
  const response = await client.post(`/releases/${id}/move-to-collection/`, payload);
  return response.data;
}
```

- [ ] **Step 2: Implement CollectionGrid**

`frontend/src/components/CollectionGrid.jsx`:
```jsx
import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { getReleases } from "../api/releases";

const columns = [
  { accessorKey: "artist", header: "Artist" },
  { accessorKey: "title", header: "Title" },
  { accessorKey: "format", header: "Format" },
  { accessorKey: "media_condition", header: "Media" },
  { accessorKey: "sleeve_condition", header: "Sleeve" },
  { accessorKey: "personal_rating", header: "Rating" },
  { accessorKey: "released_year", header: "Year" },
];

export default function CollectionGrid({ folderId, refreshKey }) {
  const [releases, setReleases] = useState([]);
  const [sorting, setSorting] = useState([]);

  useEffect(() => {
    const params = { status: "collection" };
    if (folderId) params.folder = folderId;
    getReleases(params).then(setReleases);
  }, [folderId, refreshKey]);

  const table = useReactTable({
    data: releases,
    columns: useMemo(() => columns, []),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table size="small">
      <TableHead>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableCell
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                sx={{ cursor: "pointer", fontWeight: "bold" }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableHead>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Wire it into CollectionTab**

In `frontend/src/components/CollectionTab.jsx`: add
`import CollectionGrid from "./CollectionGrid";`, replace the `Grid coming soon.` box
content with `<CollectionGrid folderId={selectedFolderId} />`.

- [ ] **Step 4: Verify manually**

Seed a couple of collection Releases (e.g. via `python manage.py shell` using the
`Release.objects.create(...)` shape from Task 3/12, or by running the CSV import once
Task 22 exists). Refresh the Collection tab. Expected: rows render with the seeded
data; clicking a column header sorts by that column (toggling asc/desc); selecting a
folder in the sidebar filters the grid to that folder's releases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/releases.js frontend/src/components/CollectionGrid.jsx frontend/src/components/CollectionTab.jsx
git commit -m "feat: add collection grid with TanStack Table"
```

---

## Task 19: Discogs search bar + results list + Add to Wishlist

**Files:**
- Create: `frontend/src/api/discogs.js`
- Create: `frontend/src/utils/discogsFormat.js`
- Create: `frontend/src/hooks/useDebouncedValue.js`
- Create: `frontend/src/components/SearchBar.jsx`
- Create: `frontend/src/components/SearchResultItem.jsx`
- Create: `frontend/src/components/SearchResultsList.jsx`
- Modify: `frontend/src/App.jsx` (render `SearchBar` + `SearchResultsList` above the tabs)

**Interfaces:**
- Consumes: `client` (Task 16), `addToWishlist` (Task 18); backend `GET /api/discogs/search/` (Task 8).
- Produces: `searchDiscogs(query: string) -> Promise<Array<{id, title, format, year, thumb, cover_image}>>`. `parseArtistTitle(title: string) -> {artist, title}` (splits on `" - "`; reused by Task 20's `App.jsx` wiring). `useDebouncedValue(value, delayMs) -> debouncedValue`. `SearchBar` props: `onResults(results)`. `SearchResultsList` props: `results`, `onAddToCollection(result)`, `onWishlisted(id)`. `onAddToCollection` is a no-op placeholder in this task — Task 20 wires it to open the real dialog.

- [ ] **Step 1: Implement the API module and utilities**

`frontend/src/api/discogs.js`:
```js
import client from "./client";

export async function searchDiscogs(query) {
  const response = await client.get("/discogs/search/", { params: { q: query } });
  return response.data.results;
}
```

`frontend/src/utils/discogsFormat.js`:
```js
export function parseArtistTitle(rawTitle) {
  const [artist, ...rest] = rawTitle.split(" - ");
  return { artist: artist || "", title: rest.join(" - ") || rawTitle };
}
```

`frontend/src/hooks/useDebouncedValue.js`:
```jsx
import { useEffect, useState } from "react";

export default function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 2: Implement SearchBar**

`frontend/src/components/SearchBar.jsx`:
```jsx
import { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";

import { searchDiscogs } from "../api/discogs";
import useDebouncedValue from "../hooks/useDebouncedValue";

export default function SearchBar({ onResults }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      onResults([]);
      return;
    }
    let cancelled = false;
    searchDiscogs(debouncedQuery).then((results) => {
      if (!cancelled) onResults(results);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, onResults]);

  return (
    <TextField
      fullWidth
      label="Search Discogs"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
    />
  );
}
```

- [ ] **Step 3: Implement SearchResultItem and SearchResultsList**

`frontend/src/components/SearchResultItem.jsx`:
```jsx
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";

import { addToWishlist } from "../api/releases";
import { parseArtistTitle } from "../utils/discogsFormat";

export default function SearchResultItem({ result, onAddToCollection, onWishlisted }) {
  const { artist, title } = parseArtistTitle(result.title);

  const handleAddToWishlist = async () => {
    await addToWishlist({
      discogs_release_id: result.id,
      artist,
      title,
      format: (result.format || []).join(", "),
      released_year: result.year || null,
      cover_art_url: result.cover_image || result.thumb || "",
    });
    onWishlisted(result.id);
  };

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar variant="square" src={result.thumb} />
      </ListItemAvatar>
      <ListItemText
        primary={`${artist} - ${title}`}
        secondary={`${(result.format || []).join(", ")} · ${result.year || "Unknown year"}`}
      />
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={handleAddToWishlist}>
          Add to Wishlist
        </Button>
        <Button size="small" variant="contained" onClick={() => onAddToCollection(result)}>
          Add to Collection
        </Button>
      </Stack>
    </ListItem>
  );
}
```

`frontend/src/components/SearchResultsList.jsx`:
```jsx
import List from "@mui/material/List";

import SearchResultItem from "./SearchResultItem";

export default function SearchResultsList({ results, onAddToCollection, onWishlisted }) {
  return (
    <List>
      {results.map((result) => (
        <SearchResultItem
          key={result.id}
          result={result}
          onAddToCollection={onAddToCollection}
          onWishlisted={onWishlisted}
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 4: Wire into App.jsx**

Replace `frontend/src/App.jsx` with:
```jsx
import { useCallback, useState } from "react";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

import CollectionTab from "./components/CollectionTab";
import SearchBar from "./components/SearchBar";
import SearchResultsList from "./components/SearchResultsList";

export default function App() {
  const [tab, setTab] = useState("collection");
  const [searchResults, setSearchResults] = useState([]);
  const [wishlistedMessage, setWishlistedMessage] = useState("");

  const handleResults = useCallback((results) => setSearchResults(results), []);
  const handleWishlisted = useCallback(
    () => setWishlistedMessage("Added to wishlist"),
    []
  );
  const handleAddToCollection = useCallback((result) => {
    console.log("open add-to-collection dialog for", result);
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ p: 2 }}>
        Collection Tracker
      </Typography>
      <Box sx={{ px: 2 }}>
        <SearchBar onResults={handleResults} />
        {searchResults.length > 0 && (
          <SearchResultsList
            results={searchResults}
            onAddToCollection={handleAddToCollection}
            onWishlisted={handleWishlisted}
          />
        )}
      </Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        <Tab label="Collection" value="collection" />
        <Tab label="Wishlist" value="wishlist" />
        <Tab label="Import" value="import" />
      </Tabs>
      <Box sx={{ p: 2 }}>
        {tab === "collection" && <CollectionTab />}
        {tab === "wishlist" && <Typography>Wishlist view coming soon.</Typography>}
        {tab === "import" && <Typography>Import view coming soon.</Typography>}
      </Box>
      <Snackbar
        open={Boolean(wishlistedMessage)}
        autoHideDuration={3000}
        onClose={() => setWishlistedMessage("")}
        message={wishlistedMessage}
      />
    </Box>
  );
}
```

- [ ] **Step 5: Verify manually**

Set a real `DISCOGS_TOKEN` in the backend environment (see Task 1's settings) and
restart the backend. Type a query into the search bar. Expected: after ~400ms of no
typing, results appear with thumbnail, artist/title, format, and year. Click "Add to
Wishlist" on one result. Expected: a "Added to wishlist" snackbar appears, and
`curl http://localhost:8000/api/releases/?status=wishlist` shows the new row. If no
token is available yet, verify instead that the request fires (browser Network tab)
and the UI doesn't crash on an empty/error result.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/discogs.js frontend/src/utils/discogsFormat.js frontend/src/hooks/useDebouncedValue.js frontend/src/components/SearchBar.jsx frontend/src/components/SearchResultItem.jsx frontend/src/components/SearchResultsList.jsx frontend/src/App.jsx
git commit -m "feat: add Discogs search with add-to-wishlist"
```

---

## Task 20: AddToCollectionDialog + wire "Add to Collection" from search

**Files:**
- Create: `frontend/src/components/AddToCollectionDialog.jsx`
- Modify: `frontend/src/components/CollectionGrid.jsx` (accept `refreshKey` prop — already added in Task 18; confirm it's used)
- Modify: `frontend/src/components/CollectionTab.jsx` (accept and forward `refreshKey` prop)
- Modify: `frontend/src/App.jsx` (open the dialog from search results, submit to the API, refresh the grid)

**Interfaces:**
- Consumes: `getFolders`, `createFolder` (Task 17); `addToCollection` (Task 18); `parseArtistTitle` (Task 19).
- Produces: `AddToCollectionDialog` props: `open` (bool), `onClose` (fn), `onSubmit(payload)` where `payload` is `{folder, media_condition, sleeve_condition, notes}` (`folder` is always a numeric id — a `"+ Create new folder"` selection resolves to a real folder via `createFolder` before `onSubmit` fires). Task 21's `WishlistTab` reuses this component verbatim.

- [ ] **Step 1: Implement AddToCollectionDialog**

`frontend/src/components/AddToCollectionDialog.jsx`:
```jsx
import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { createFolder, getFolders } from "../api/folders";

const CONDITIONS = [
  "Mint", "Near Mint", "Very Good Plus", "Very Good",
  "Good Plus", "Good", "Fair", "Poor",
];

const NEW_FOLDER_VALUE = "__new_folder__";

export default function AddToCollectionDialog({ open, onClose, onSubmit }) {
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [mediaCondition, setMediaCondition] = useState("");
  const [sleeveCondition, setSleeveCondition] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) getFolders().then(setFolders);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFolderId("");
      setNewFolderName("");
      setMediaCondition("");
      setSleeveCondition("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    let resolvedFolderId = folderId;
    if (folderId === NEW_FOLDER_VALUE) {
      const created = await createFolder(newFolderName.trim());
      resolvedFolderId = created.id;
    }
    onSubmit({
      folder: resolvedFolderId,
      media_condition: mediaCondition || null,
      sleeve_condition: sleeveCondition || null,
      notes,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add to Collection</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Folder"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
          >
            {folders.map((folder) => (
              <MenuItem key={folder.id} value={folder.id}>
                {folder.name}
              </MenuItem>
            ))}
            <MenuItem value={NEW_FOLDER_VALUE}>+ Create new folder</MenuItem>
          </TextField>
          {folderId === NEW_FOLDER_VALUE && (
            <TextField
              label="New folder name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
            />
          )}
          <TextField
            select
            label="Media Condition"
            value={mediaCondition}
            onChange={(event) => setMediaCondition(event.target.value)}
          >
            {CONDITIONS.map((condition) => (
              <MenuItem key={condition} value={condition}>
                {condition}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Sleeve Condition"
            value={sleeveCondition}
            onChange={(event) => setSleeveCondition(event.target.value)}
          >
            {CONDITIONS.map((condition) => (
              <MenuItem key={condition} value={condition}>
                {condition}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Notes"
            multiline
            minRows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!folderId || (folderId === NEW_FOLDER_VALUE && !newFolderName.trim())}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 2: Thread `refreshKey` through CollectionTab**

In `frontend/src/components/CollectionTab.jsx`, accept a `refreshKey` prop and forward
it to `CollectionGrid`:
```jsx
export default function CollectionTab({ refreshKey }) {
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <Box sx={{ width: 220 }}>
        <FolderSidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
        />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <CollectionGrid folderId={selectedFolderId} refreshKey={refreshKey} />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Wire the dialog into App.jsx**

In `frontend/src/App.jsx`: add
`import AddToCollectionDialog from "./components/AddToCollectionDialog";`,
`import { addToCollection } from "./api/releases";`, and
`import { parseArtistTitle } from "./utils/discogsFormat";`. Add state
`addToCollectionTarget` (the search result, or `null`) and `collectionRefreshKey`
(starts at `0`). Replace `handleAddToCollection` and render `CollectionTab` and the
dialog as follows:
```jsx
  const [addToCollectionTarget, setAddToCollectionTarget] = useState(null);
  const [collectionRefreshKey, setCollectionRefreshKey] = useState(0);

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
      ...dialogPayload,
    });
    setAddToCollectionTarget(null);
    setCollectionRefreshKey((key) => key + 1);
  };
```
Replace `{tab === "collection" && <CollectionTab />}` with
`{tab === "collection" && <CollectionTab refreshKey={collectionRefreshKey} />}`, and add
just before the closing `</Box>` of the component:
```jsx
      <AddToCollectionDialog
        open={Boolean(addToCollectionTarget)}
        onClose={() => setAddToCollectionTarget(null)}
        onSubmit={handleDialogSubmit}
      />
```

- [ ] **Step 4: Verify manually**

Search for a release, click "Add to Collection" on a result. Expected: the dialog
opens with a folder dropdown (existing folders + "+ Create new folder"), condition
dropdowns, and a notes field. Pick an existing folder and submit. Expected: the dialog
closes and the Collection tab's grid immediately shows the new row in that folder.
Repeat, this time choosing "+ Create new folder" and typing a new name. Expected: the
folder is created and the release appears under it.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AddToCollectionDialog.jsx frontend/src/components/CollectionTab.jsx frontend/src/App.jsx
git commit -m "feat: add AddToCollectionDialog and wire it to search results"
```

---

## Task 21: WishlistTab + Move to Collection

**Files:**
- Create: `frontend/src/components/WishlistTab.jsx`
- Modify: `frontend/src/App.jsx` (render `WishlistTab` instead of the placeholder)

**Interfaces:**
- Consumes: `getReleases`, `moveToCollection` (Task 18); `AddToCollectionDialog` (Task 20).
- Produces: `WishlistTab` — a self-contained component with no props, fetching its own data and reusing `AddToCollectionDialog` for the "Move to Collection" action.

- [ ] **Step 1: Implement WishlistTab**

`frontend/src/components/WishlistTab.jsx`:
```jsx
import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

import { getReleases, moveToCollection } from "../api/releases";
import AddToCollectionDialog from "./AddToCollectionDialog";

export default function WishlistTab() {
  const [items, setItems] = useState([]);
  const [target, setTarget] = useState(null);

  const refresh = useCallback(() => {
    getReleases({ status: "wishlist" }).then(setItems);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = async (payload) => {
    await moveToCollection(target.id, payload);
    setTarget(null);
    refresh();
  };

  return (
    <>
      <List>
        {items.map((item) => (
          <ListItem
            key={item.id}
            secondaryAction={
              <Button variant="contained" size="small" onClick={() => setTarget(item)}>
                Move to Collection
              </Button>
            }
          >
            <ListItemText
              primary={`${item.artist} - ${item.title}`}
              secondary={`${item.format} · ${item.released_year || "Unknown year"}`}
            />
          </ListItem>
        ))}
      </List>
      <AddToCollectionDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
```

- [ ] **Step 2: Wire into App.jsx**

In `frontend/src/App.jsx`: add `import WishlistTab from "./components/WishlistTab";`
and replace `{tab === "wishlist" && <Typography>Wishlist view coming soon.</Typography>}`
with `{tab === "wishlist" && <WishlistTab />}`.

- [ ] **Step 3: Verify manually**

Go to the Wishlist tab (it should list the item added to wishlist in Task 19). Click
"Move to Collection", fill in the folder/condition/notes dialog, submit. Expected: the
item disappears from the Wishlist tab's list, and switching to the Collection tab shows
it in the chosen folder.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/WishlistTab.jsx frontend/src/App.jsx
git commit -m "feat: add wishlist tab with move-to-collection"
```

---

## Task 22: CSV import panel (dry-run, folder-conflict modal, commit)

**Files:**
- Create: `frontend/src/api/importCsv.js`
- Create: `frontend/src/components/FolderConflictModal.jsx`
- Create: `frontend/src/components/CsvImportPanel.jsx`
- Modify: `frontend/src/App.jsx` (render `CsvImportPanel` instead of the placeholder)

**Interfaces:**
- Consumes: `client` (Task 16); backend `POST /api/import/discogs-csv/dry-run/` and
  `POST /api/import/discogs-csv/commit/` (Tasks 11, 13).
- Produces: `dryRunImport(file: File) -> Promise<{new_folders: string[]}>`,
  `commitImport(file: File, folderMode: "per_folder" | "main_only") -> Promise<{created, skipped_duplicates, folders_created}>`.
  `FolderConflictModal` props: `open`, `newFolders` (string[]), `onChoose(folderMode)`.

- [ ] **Step 1: Implement the API module**

`frontend/src/api/importCsv.js`:
```js
import client from "./client";

export async function dryRunImport(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await client.post("/import/discogs-csv/dry-run/", formData);
  return response.data;
}

export async function commitImport(file, folderMode) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder_mode", folderMode);
  const response = await client.post("/import/discogs-csv/commit/", formData);
  return response.data;
}
```

- [ ] **Step 2: Implement FolderConflictModal**

`frontend/src/components/FolderConflictModal.jsx`:
```jsx
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function FolderConflictModal({ open, newFolders, onChoose }) {
  return (
    <Dialog open={open}>
      <DialogTitle>New folders found</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This file references folders: {newFolders.join(", ")}. Create them and
          sort items accordingly, or add everything to a single Main folder?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onChoose("main_only")}>Use Main folder</Button>
        <Button variant="contained" onClick={() => onChoose("per_folder")}>
          Create folders
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 3: Implement CsvImportPanel**

`frontend/src/components/CsvImportPanel.jsx`:
```jsx
import { useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { commitImport, dryRunImport } from "../api/importCsv";
import FolderConflictModal from "./FolderConflictModal";

export default function CsvImportPanel() {
  const [file, setFile] = useState(null);
  const [newFolders, setNewFolders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const runCommit = async (folderMode) => {
    setNewFolders(null);
    setLoading(true);
    const result = await commitImport(file, folderMode);
    setLoading(false);
    setSummary(result);
  };

  const handleImportClick = async () => {
    if (!file) return;
    setLoading(true);
    setSummary(null);
    const result = await dryRunImport(file);
    setLoading(false);
    if (result.new_folders.length > 0) {
      setNewFolders(result.new_folders);
    } else {
      await runCommit("per_folder");
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <input
        type="file"
        accept=".csv"
        onChange={(event) => setFile(event.target.files[0] || null)}
      />
      <Button variant="contained" disabled={!file || loading} onClick={handleImportClick}>
        Import
      </Button>
      {loading && <CircularProgress size={24} />}
      {summary && (
        <Typography>
          Imported {summary.created} releases, skipped {summary.skipped_duplicates}{" "}
          duplicates. Folders created: {summary.folders_created.join(", ") || "none"}.
        </Typography>
      )}
      <FolderConflictModal
        open={Boolean(newFolders)}
        newFolders={newFolders || []}
        onChoose={runCommit}
      />
    </Stack>
  );
}
```

- [ ] **Step 4: Wire into App.jsx**

In `frontend/src/App.jsx`: add `import CsvImportPanel from "./components/CsvImportPanel";`
and replace `{tab === "import" && <Typography>Import view coming soon.</Typography>}`
with `{tab === "import" && <CsvImportPanel />}`.

- [ ] **Step 5: Verify manually**

Create a small fixture CSV file on disk with the same header row used in the backend
tests (`Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition`)
and two rows referencing two different `CollectionFolder` values. In the Import tab,
choose the file and click "Import". Expected: the folder-conflict modal appears listing
both folder names. Click "Create folders". Expected: a summary line reports the correct
created/skipped counts and folder names created; switching to the Collection tab shows
the new folders and releases.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/importCsv.js frontend/src/components/FolderConflictModal.jsx frontend/src/components/CsvImportPanel.jsx frontend/src/App.jsx
git commit -m "feat: add CSV import panel with folder-conflict modal"
```

---

## Task 23: UI/UX design pass (ui-ux-pro-max)

**Files:**
- Modify: `frontend/src/components/SearchResultsList.jsx`, `SearchResultItem.jsx`
- Modify: `frontend/src/components/AddToCollectionDialog.jsx`
- Modify: `frontend/src/components/FolderSidebar.jsx`, `CollectionTab.jsx`
- Modify: `frontend/src/components/CollectionGrid.jsx`

**Interfaces:**
- Consumes: every component built in Tasks 17–22.
- Produces: the same components, visually and structurally refined, with identical
  props/behavior contracts (no prop renames, no new required props — this task only
  touches layout, spacing, typography, color, and responsive behavior).

This task is a design pass, not a from-scratch build — the functional components
already exist from Tasks 17–22. Do not skip the skill invocation or silently apply
generic styling instead.

- [ ] **Step 1: Invoke the ui-ux-pro-max skill**

Explicitly invoke the `ui-ux-pro-max` skill and say out loud in the response that it is
being invoked (do not assume it auto-triggers). Direct it at these four surfaces:
1. Search results layout (`SearchResultsList.jsx`, `SearchResultItem.jsx`)
2. The add-to-collection popup (`AddToCollectionDialog.jsx`)
3. Folder navigation (`FolderSidebar.jsx`, its layout within `CollectionTab.jsx`)
4. The collection grid (`CollectionGrid.jsx`)

- [ ] **Step 2: Apply the resulting design changes**

Edit each of the six files listed above to apply the skill's recommendations —
spacing, typography, color, hover/selected states, responsive behavior for narrow
viewports, etc. Preserve every existing prop name and every existing `onXxx` callback
signature: other components (`App.jsx`, `WishlistTab.jsx`) call these components and
must not need changes.

- [ ] **Step 3: Verify manually — no functional regression**

Re-run the golden paths from Tasks 18–22 in the browser: search → add to wishlist,
search → add to collection, folder selection filtering the grid, column sorting,
wishlist → move to collection, CSV import happy path. Expected: all still work exactly
as before, now with the refined visual design.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "style: apply ui-ux-pro-max design pass to search, dialog, sidebar, and grid"
```

---

## Task 24: Dockerize (backend, frontend + nginx, docker-compose)

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces:**
- Consumes: the complete backend (Task 15) and frontend (Task 23).
- Produces: a `docker compose up --build` deployment — `frontend` container on host
  port `8080` serving the built React app and reverse-proxying `/api/*` to the
  `backend` container; SQLite persisted on a named volume mounted at `/data` in the
  backend container.

- [ ] **Step 1: Write the Dockerfiles and nginx config**

`backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

`frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

`frontend/nginx.conf`:
```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }
}
```

- [ ] **Step 2: Write docker-compose.yml and .env.example**

`docker-compose.yml`:
```yaml
services:
  backend:
    build: ./backend
    environment:
      - DISCOGS_TOKEN=${DISCOGS_TOKEN}
      - DISCOGS_USER_AGENT=${DISCOGS_USER_AGENT}
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
      - DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS:-*}
      - DJANGO_DEBUG=false
      - DJANGO_DB_PATH=/data/db.sqlite3
    volumes:
      - collection_tracker_data:/data
    expose:
      - "8000"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "8080:80"

volumes:
  collection_tracker_data:
```

`.env.example` (repo root):
```
DISCOGS_TOKEN=your-discogs-personal-access-token
DISCOGS_USER_AGENT=CollectionTracker/1.0 +https://beauvalet.ca
DJANGO_SECRET_KEY=change-me-in-production
DJANGO_ALLOWED_HOSTS=beauvalet.ca
```

- [ ] **Step 3: Verify manually**

Copy `.env.example` to `.env` and fill in a real `DISCOGS_TOKEN`. Run
`docker compose up --build`. Expected: both containers start cleanly. Run
`curl http://localhost:8080/api/folders/` — expect `[]` (or existing folders) as JSON,
proving the nginx reverse proxy reaches the backend. Open `http://localhost:8080` in a
browser and confirm the full app loads and every tab (Collection, Wishlist, Import)
works end-to-end against the containerized backend.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile frontend/nginx.conf docker-compose.yml .env.example
git commit -m "feat: dockerize backend and frontend for homelab deployment"
```

---

## Task 25: Collection grid filter controls (format, artist, condition, rating, year)

**Added post-final-review.** The spec's Collection View section requires the grid to be
"filterable/sortable by folder, format, artist, condition, rating, year." Task 18 wired up
folder-filtering and column sorting only; the backend (`GET /api/releases/`, Task 5) already
supports `format`, `artist`, `condition`, `rating`, and `year` query params, but no task ever
built UI for them. This task closes that gap.

**Files:**
- Create: `frontend/src/components/CollectionFilterBar.jsx`
- Modify: `frontend/src/components/CollectionGrid.jsx`

**Interfaces:**
- Consumes: `getReleases(params)` (Task 18); `useDebouncedValue(value, delayMs)` (Task 19,
  already used by `SearchBar`).
- Produces: `CollectionFilterBar` props: `filters` (`{format, artist, condition, rating,
  year}`, all strings, `""` meaning "no filter"), `onChange(nextFilters)`. `CollectionGrid`
  gains local `filters` state alongside its existing `folderId`/`refreshKey` props (both
  unchanged) and merges non-empty filter values into the params object it already builds,
  debounced at 400ms via the existing `useDebouncedValue` hook — matching the debounce
  convention already established for the Discogs search bar.

**Do not touch:** `CollectionGrid`'s existing `columns` array, `useReactTable` wiring, table
rendering (including the `TableContainer` wrapper and empty-state early return added during
the Task 23 design pass), or its `folderId`/`refreshKey` props — this task only adds new
filter state and a new params-merging step above what's already there.

- [ ] **Step 1: Read the current file first**

Read `frontend/src/components/CollectionGrid.jsx` in full before editing — it has already
been modified twice (Task 18's initial build, Task 23's design pass) and this step must
preserve everything already there.

- [ ] **Step 2: Implement CollectionFilterBar**

`frontend/src/components/CollectionFilterBar.jsx`:
```jsx
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

const CONDITIONS = [
  "Mint", "Near Mint", "Very Good Plus", "Very Good",
  "Good Plus", "Good", "Fair", "Poor",
];

export default function CollectionFilterBar({ filters, onChange }) {
  const handleField = (field) => (event) => {
    onChange({ ...filters, [field]: event.target.value });
  };

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
      <TextField
        label="Format"
        size="small"
        value={filters.format}
        onChange={handleField("format")}
      />
      <TextField
        label="Artist"
        size="small"
        value={filters.artist}
        onChange={handleField("artist")}
      />
      <TextField
        select
        label="Condition"
        size="small"
        sx={{ minWidth: 160 }}
        value={filters.condition}
        onChange={handleField("condition")}
      >
        <MenuItem value="">Any</MenuItem>
        {CONDITIONS.map((condition) => (
          <MenuItem key={condition} value={condition}>
            {condition}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Rating"
        size="small"
        sx={{ minWidth: 100 }}
        value={filters.rating}
        onChange={handleField("rating")}
      >
        <MenuItem value="">Any</MenuItem>
        {[0, 1, 2, 3, 4, 5].map((rating) => (
          <MenuItem key={rating} value={String(rating)}>
            {rating}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Year"
        size="small"
        sx={{ width: 100 }}
        value={filters.year}
        onChange={handleField("year")}
      />
    </Stack>
  );
}
```

- [ ] **Step 3: Wire it into CollectionGrid**

In `frontend/src/components/CollectionGrid.jsx`:
1. Add imports: `import { useState } from "react";` (merge into the existing React import
   if one is already there), `import CollectionFilterBar from "./CollectionFilterBar";`,
   `import useDebouncedValue from "../hooks/useDebouncedValue";`.
2. Add state: `const [filters, setFilters] = useState({format: "", artist: "", condition: "", rating: "", year: ""});`
   and `const debouncedFilters = useDebouncedValue(filters, 400);`.
3. In the data-fetching `useEffect`, after the existing `if (folderId) params.folder = folderId;`
   line, add:
   ```js
   if (debouncedFilters.format) params.format = debouncedFilters.format;
   if (debouncedFilters.artist) params.artist = debouncedFilters.artist;
   if (debouncedFilters.condition) params.condition = debouncedFilters.condition;
   if (debouncedFilters.rating) params.rating = debouncedFilters.rating;
   if (debouncedFilters.year) params.year = debouncedFilters.year;
   ```
   and add `debouncedFilters` to that effect's dependency array (alongside the existing
   `folderId`, `refreshKey`).
4. Render `<CollectionFilterBar filters={filters} onChange={setFilters} />` immediately
   above the existing table/`TableContainer` markup — do not alter anything below it.

- [ ] **Step 4: Verify manually**

Run `npm run build` to confirm it compiles. With the backend running and a few collection
releases seeded (different formats/artists/conditions/ratings/years), drive the app: typing
in the Format or Artist field filters the grid after ~400ms of no typing; selecting a
Condition or Rating filters immediately; typing a Year filters the grid; combining a folder
selection with these filters narrows further; clearing a field (back to `""`) removes that
filter. Confirm sorting and the existing empty-state/TableContainer behavior from Task 23
still work unchanged.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CollectionFilterBar.jsx frontend/src/components/CollectionGrid.jsx
git commit -m "feat: add format/artist/condition/rating/year filters to collection grid"
```

---
