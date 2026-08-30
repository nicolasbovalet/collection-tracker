# Media Collection Tracker — Design

## Overview

A personal media collection tracker (CDs, vinyl, etc.) for a single user, deployed
to an existing homelab Docker LXC and exposed via Cloudflare tunnel at
`beauvalet.ca`. Users manage a wishlist and collection sourced from Discogs —
either by bulk CSV import of an existing Discogs collection export, or by
searching Discogs directly and adding results. There is no manual entry form;
all releases originate from Discogs data.

## Stack

- Backend: Django + Django REST Framework, SQLite
- Frontend: React + MUI, TanStack Table for the collection grid
- Deployment: Docker Compose (nginx + backend), homelab LXC, Cloudflare tunnel

## Architecture

Three containers via docker-compose:

- **backend** — Django + DRF + gunicorn. SQLite database file on a mounted
  volume so data survives container rebuilds.
- **frontend** — build stage only: `npm run build` produces static assets
  consumed by the nginx container (not run standalone).
- **nginx** — serves the built React static assets and reverse-proxies
  `/api/*` to the backend container.

No application-level authentication. Access control is handled at the network
level (Cloudflare Access / tunnel restriction to `beauvalet.ca`) — this is a
single-user personal tool.

The Discogs personal access token and a descriptive User-Agent string live
only in the backend container's environment (`DISCOGS_TOKEN`,
`DISCOGS_USER_AGENT`). They are never sent to the frontend; all Discogs calls
are proxied through backend endpoints.

Backend code organization: a single Django app `tracker` containing:
- `models.py` — Folder, Release
- `discogs.py` — service module wrapping all Discogs HTTP calls (search,
  release detail lookup, request throttling)
- `csv_import.py` — CSV parsing, folder extraction (dry-run), condition/field
  mapping, and commit logic
- `serializers.py`, `views.py` — DRF API surface

## Data model

### Folder
- `id`
- `name` (unique)
- `source`: enum `discogs_import` | `user_created`

### Release
- `id`
- `discogs_release_id` — **not nullable**. Every Release originates either
  from a CSV import row or a Discogs search result, both of which always
  carry a release id. There is no creation path that lacks one.
- `catalog_number` — nullable (wishlist items may not have one)
- `artist`
- `title`
- `label`
- `format` — free text (Discogs format strings are compound, e.g. `12", EP`),
  not an enum
- `personal_rating` — integer 0–5, nullable
- `released_year` — nullable (may be absent from search results or blank in
  CSV exports)
- `status`: enum `wishlist` | `collection`
- `folder` — FK to Folder, null=True (wishlist items have no folder)
- `date_added` — stored explicitly, not `auto_now_add`. CSV imports preserve
  the actual "Date Added" value from the file; search-based adds set it to
  the current time on creation.
- `media_condition` — condition enum, nullable, collection only
- `sleeve_condition` — condition enum, nullable, collection only
- `notes`
- `cover_art_url`

### Condition enum
Used for both `media_condition` and `sleeve_condition`, matching the Discogs
grading scale: `Mint`, `Near Mint`, `Very Good Plus`, `Very Good`,
`Good Plus`, `Good`, `Fair`, `Poor`.

### Folder lifecycle
Folders are create-only in v1 — created via CSV import (source=`discogs_import`)
or via inline "create new folder" in the add-to-collection popup
(source=`user_created`). No rename/delete UI in this version.

## Discogs CSV import

1. User uploads a CSV. Parsed with Python's `csv` module (handles quoted
   fields containing commas, e.g. `Format = "12", EP"`).
2. **Dry-run** — `POST /api/import/discogs-csv/dry-run/`. Parses the file and
   returns the distinct non-empty `CollectionFolder` values not already
   present as Folders. Nothing is committed or persisted server-side between
   requests — the endpoint is stateless.
3. Frontend shows a confirmation modal: "This file references folders:
   [list]. Create them and sort items accordingly, or add everything to a
   single Main folder?"
4. **Commit** — `POST /api/import/discogs-csv/commit/`. The frontend
   re-uploads the same file along with the user's choice
   (`folder_mode: per_folder | main_only`). The backend re-parses and performs
   the full import in one pass (no server-side temp storage to manage):
   - Creates chosen folders (`source=discogs_import`).
   - Creates Release rows with `status=collection`.
   - Maps `CollectionFolder` → folder; blank `CollectionFolder`, or
     `folder_mode=main_only`, routes to a default "Main" folder (created if
     it doesn't exist).
   - Maps `Collection Media Condition` / `Collection Sleeve Condition`
     strings onto the condition enum by matching the text before `" ("` —
     e.g. `"Very Good Plus (VG+)"` → `Very Good Plus` — so the mapping
     tolerates variation in the parenthetical abbreviation.
   - Maps `Rating` → `personal_rating`.
   - **Dedup**: rows whose `discogs_release_id` already exists as a
     `status=collection` Release are skipped (not re-created or updated).
     The response reports how many rows were skipped, so it's safe to
     re-run an import over the same or an overlapping export file.
5. Cover art: `GET https://api.discogs.com/releases/{release_id}` per row,
   with the descriptive User-Agent and personal access token (60/min rate
   limit). Calls are throttled server-side during the commit, not fired in
   parallel. If a lookup fails or times out for a given row, that Release is
   still created with `cover_art_url` left blank, and the import continues —
   a single flaky API call doesn't abort the batch.
6. The commit request runs synchronously; the frontend shows a spinner until
   it completes. This is appropriate for personal-collection-sized imports
   (hundreds of rows), not intended to scale to tens of thousands.

## Discogs search & add

Search and Discogs-backed add-flows replace manual entry entirely — there is
no add form anywhere in the app.

1. Search bar, debounced ~400ms, calls
   `GET /api/discogs/search/?q={query}` on the backend, which proxies to
   `GET https://api.discogs.com/database/search?q={query}&type=release`
   using the server-side personal access token.
2. Results list shows title, artist, format, year, and thumbnail — using the
   `cover_image`/`thumb` field already present in the search response (no
   extra API call).
3. Each result has two actions:
   - **Add to Wishlist** — `POST /api/releases/wishlist/`. Single click,
     immediately creates a Release with `status=wishlist`,
     `discogs_release_id`, and `cover_art_url` from the search result's
     thumbnail. No popup.
   - **Add to Collection** — opens a popup with folder select (existing
     folders + inline "create new folder"), media condition dropdown, sleeve
     condition dropdown, notes textarea. On submit,
     `POST /api/releases/collection/` creates a Release with
     `status=collection` and the chosen fields.

## Wishlist tab

Lists all Release rows with `status=wishlist`. Each item has a "Move to
Collection" action that opens the same folder/condition popup used by
Add to Collection, and on submit calls
`POST /api/releases/{id}/move-to-collection/`, which flips `status` to
`collection` and sets the folder/condition/notes fields.

## Collection view

TanStack Table grid, filterable/sortable by folder, format, artist,
condition, rating, and year. Folder navigation as a sidebar. Backed by
`GET /api/releases/?status=collection&folder=&format=&artist=&condition=&rating=&year=&ordering=`.

## API summary

- `GET/POST /api/folders/`
- `GET /api/releases/?status=collection&folder=&format=&artist=&condition=&rating=&year=&ordering=`
- `GET /api/releases/?status=wishlist`
- `POST /api/releases/wishlist/`
- `POST /api/releases/collection/`
- `POST /api/releases/{id}/move-to-collection/`
- `GET /api/discogs/search/?q=...`
- `POST /api/import/discogs-csv/dry-run/`
- `POST /api/import/discogs-csv/commit/`

## Design / UX

Frontend built with React + MUI. The **ui-ux-pro-max** skill will be invoked
during implementation for the full UI/UX pass on search results layout, the
add-to-collection popup, folder navigation, and the collection grid —
invocation will be confirmed explicitly rather than assumed.

## Testing

- **Backend**: Django test cases for the CSV parser and condition-mapping
  functions (pure functions, exercised against fixture CSVs), the dedup
  logic, and API endpoints with the Discogs client mocked (no real network
  calls in tests).
- **Frontend**: exercised manually against a running dev server for the
  golden paths — search → add to wishlist/collection, CSV import happy path
  and the folder-conflict modal, wishlist → collection move — per standard
  verification practice. Anything that can't be verified this way will be
  called out explicitly.

## Build order

1. Django models + migrations
2. CSV import (dry-run + commit endpoints)
3. Discogs search proxy endpoint
4. Add-to-collection / wishlist endpoints
5. React frontend
