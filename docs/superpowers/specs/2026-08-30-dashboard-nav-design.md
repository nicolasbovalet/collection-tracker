# Dashboard, Sidebar Navigation, and Stats — Design

## Overview

This extends the existing Media Collection Tracker (spec:
`docs/superpowers/specs/2026-08-29-collection-tracker-design.md`) with a
restructured top-level navigation and two new pages: a Dashboard landing
page and a Stats analytics page. It also adds three new Discogs-sourced
fields to `Release` (`genre`, `estimated_value`, `num_for_sale`) to support
the new Stats page, following the same integration pattern already
established for the `country` field.

This is a navigation/structure change plus additive backend data — it does
not alter any existing Collection, Wishlist, or CSV import/export behavior.

## Navigation

The current top `Tabs` row (Collection / Wishlist / Import) is replaced by
a persistent left sidebar with five items, in this order:

1. **Dashboard** (new)
2. **Collection** (existing — the folder-sidebar + grid/table view, unchanged)
3. **Wishlist** (existing, unchanged, keeps its current name)
4. **Search** (existing search functionality, relocated — see below)
5. **Stats** (new)

The sidebar drives which page renders in the main content area, using the
same "one active page" state model the app already uses for tabs — no URL
routing or deep-linking is introduced (matching current behavior; a page
refresh returns to the default page, same as today). The sidebar is a
permanent MUI `Drawer` on desktop and collapses to an icon rail or a
toggleable drawer on narrow viewports, consistent with the app's existing
responsive conventions (see the original spec's design pass).

The Import tab's functionality (CSV import + export) does not disappear —
it needs a new home in the sidebar. It is folded into the **Stats** page as
a lower section ("Import / Export"), since neither warranted a sixth
top-level nav item on its own and both are occasional/maintenance actions
rather than everyday browsing, unlike the other four pages.

## Search page

The existing `SearchBar` + `SearchResultsList` + `AddToCollectionDialog`
wiring (currently rendered above the tabs on every page) moves to be the
content of the dedicated **Search** page instead. Functionally this is a
pure relocation: the same debounced search, the same thumbnail-first result
cards, the same "Add to Wishlist" (immediate) / "Add to Collection" (opens
the shared dialog) actions, the same backend endpoint
(`GET /api/discogs/search/`). No behavior changes. It is no longer visible
from the Collection, Wishlist, Dashboard, or Stats pages.

## Dashboard page

A quick-glance landing page, requiring no new backend endpoint beyond what
Stats needs (see below) — it reads a subset of the same aggregation data.
Contents:

- Three headline numbers: total collection count, total wishlist count,
  total estimated collection value (sum of `estimated_value` across
  collection releases that have a value; releases without one are excluded
  from the sum, not treated as zero).
- A "Recent Additions" row: the most recent N (e.g. 8) collection releases
  by `date_added`, shown as small cover-art cards (same visual language as
  the Collection page's cover grid — cover image, artist, title).

No personalized greeting, no activity feed, no marketplace/explore
widgets — those exist in the reference screenshot the user shared but were
not requested and are explicitly out of scope for this iteration.

## Stats page

The analytics page. All charts are computed on demand from the `Release`
table via Django aggregation queries — no new time-series storage, no
scheduled jobs. For a personal-collection-sized dataset (hundreds of rows)
this is fast enough to compute per page load.

Contents:

- **Format distribution** — a bucketed breakdown of the free-text `format`
  field. Since `format` values are compound strings (e.g. `"Vinyl, LP"`,
  `"CD, Album, Reissue"`), bucket by the first comma-separated token
  (`"Vinyl"`, `"CD"`, `"Cassette"`, etc.) for the chart; the full string
  remains stored and shown elsewhere (grid, cards) unchanged.
- **Condition distribution** — count of collection releases per
  `media_condition` value (using the existing 8-value enum), plus a
  "Not graded" bucket for `null`.
- **Genre distribution** — count of collection releases per `genre` value
  (new field, see Backend below). A release with multiple genres counts
  toward each (Discogs releases can have more than one genre); a release
  with no genre recorded falls into "Unknown".
- **Total and per-item value** — the same total shown on the Dashboard,
  plus the ability to see estimated value alongside each release (a new
  `estimated_value` column/field surfaced in the Collection grid's table
  view and on cover-grid cards, when present).
- **Cumulative value by date added** — a line chart plotting the running
  sum of `estimated_value` ordered by `date_added`. This is explicitly an
  approximation of collection growth over time (when you added things,
  valued at today's prices), not a historical record of actual market price
  changes — labeled as such in the UI so it isn't mistaken for real
  historical pricing data.
- **Import / Export** — the CSV import panel (dry-run, folder-conflict
  modal, commit summary) and the "Export Collection to CSV" button, both
  moved here unchanged from the current Import tab.

## Backend

### New `Release` fields

- `genre` — `CharField`, blank-default, storing Discogs' genre list joined
  as a comma-separated string (e.g. `"Rock, Electronic"`), mirroring how
  `format` is already stored as a flattened string rather than a structured
  list. Stats-page genre counting splits on comma to attribute a
  multi-genre release to each genre bucket.
- `estimated_value` — nullable `DecimalField` (2 decimal places), from
  Discogs' `lowest_price` field on the release-detail response. `null` when
  Discogs has no marketplace data for that release (no copies currently
  listed for sale) or when the lookup fails — never defaults to `0`, since
  that would misrepresent "no data" as "worthless" in aggregates.
- `num_for_sale` — nullable `PositiveIntegerField`, from Discogs'
  `num_for_sale` field. Informational only (not directly charted in this
  iteration, but stored since it's free alongside `estimated_value`).

Migration follows the same pattern as the `country` field's migration.

### Discogs integration

- `DiscogsClient.search()` — already extended once for `country`; extend
  again to include `genre` (Discogs search results carry a `genre` field,
  typically a list — join with `", "` the same way `format` is joined
  today), if present in the response.
- `DiscogsClient.get_release_details()` — already returns
  `{cover_art_url, country}` from one release-detail lookup; extend to also
  return `genre` (joined the same way), `estimated_value` (from
  `lowest_price`, as a string/number — cast to `Decimal` or `None` at the
  call site), and `num_for_sale` (from `num_for_sale`, or `None`). Still
  exactly one Discogs API call per release — no new call, no new throttle
  cost, consistent with the "free" pricing source decision.
- `commit_import()`'s injected `fetch_release_details` callable contract
  extends again to carry these three additional keys, with the same
  "exception leaves everything blank/null, row still created, import never
  aborts" guarantee already established for `cover_art_url`/`country`.
- `AddToWishlistSerializer`/`AddToCollectionSerializer` gain `genre`,
  `estimated_value`, `num_for_sale` fields (all optional/blank-default),
  matching the `country` precedent, so search-based adds carry through
  whatever the search response already has. Discogs search results don't
  include pricing data (only release-detail lookups do), and `genre` in
  search results may be present or absent depending on the release. **Decision:
  search-based adds do NOT trigger an extra release-detail lookup for
  `estimated_value`/`num_for_sale`** — these start blank/null for anything
  added via search and get filled in by the next `backfill_discogs_metadata`
  run, exactly like `country` already works today for search-based adds.
  This avoids adding per-add latency to the common "search and add one
  item" flow. CSV import gets this data for free, since its per-row
  release-detail lookup already exists for cover art/country.

### Backfill command

Extend the existing `backfill_country` management command into a combined
`backfill_discogs_metadata` command (rename) that backfills all of
`country`, `genre`, `estimated_value`, and `num_for_sale` for any
collection release missing them, in one throttled pass over
`Release.objects.filter(status=Release.STATUS_COLLECTION)` (not restricted
to blank-`country` only, since the other three fields are new and every
existing release needs a first pass) — one Discogs call per release, same
throttle behavior, same "continue past a single release's failure" contract
as the original command.

### New endpoint: `GET /api/stats/`

Returns pre-aggregated data for the Stats (and Dashboard) pages in one
response: collection count, wishlist count, total estimated value, format
distribution, condition distribution, genre distribution, and the
cumulative-value-by-date-added series. Computed via Django `.aggregate()`/
`.values().annotate()` queries against `Release`, scoped to
`status=collection` for the distributions (wishlist items don't count
toward collection stats), except wishlist count itself which is a simple
count of `status=wishlist`.

## Testing

- **Backend**: automated tests for the new model fields, the extended
  `DiscogsClient` methods, the extended `commit_import` contract (same
  rigor as the `country` change — dedup/folder-resolution/non-abort
  guarantees re-verified, not just the new fields), the renamed/extended
  backfill command, and the new `GET /api/stats/` endpoint's aggregation
  correctness (known fixture data in, known counts/sums out).
- **Frontend**: no automated suite (matches project convention); golden
  paths verified live against a running dev server — sidebar navigation
  between all five pages, Search page functioning identically to today's
  inline search, Dashboard's numbers and recent-additions row, Stats page's
  charts rendering with real aggregated data, Import/Export still working
  from its new location on the Stats page.

## Build order

1. Backend: `genre`/`estimated_value`/`num_for_sale` fields + migration.
2. Backend: extend `DiscogsClient.search()` and `get_release_details()`.
3. Backend: extend `commit_import()`'s fetch-callable contract (TDD, full
   dedup/folder/non-abort re-verification).
4. Backend: extend `AddToWishlistSerializer`/`AddToCollectionSerializer`.
5. Backend: rename/extend the backfill command.
6. Backend: `GET /api/stats/` endpoint.
7. Frontend: sidebar navigation shell (replaces the Tabs row).
8. Frontend: Search page (relocate existing search UI).
9. Frontend: Dashboard page.
10. Frontend: Stats page (charts + relocated Import/Export panel).
