// Groups an already-sorted `releases` array into labeled sections for display,
// mirroring the ordering the backend already applied via `?ordering=`.
//
// The backend is the source of truth for sort order. This module never
// re-sorts or re-orders anything — it only walks the array once and starts a
// new section whenever the locally-computed group label changes from the
// previous item. This keeps grouping trivially consistent with whatever
// order (ascending or descending) the backend produced.

/**
 * Computes the artist grouping key for a release, replicating the backend's
 * exact "The " stripping logic:
 *
 *   Case(When(artist__istartswith="The ", then=Substr("artist", 5)), default="artist")
 *
 * Substr(..., 5) is 1-indexed and returns everything from the 5th character
 * onward, i.e. it strips exactly the 4 literal characters "The " (case
 * insensitive). In 0-indexed JS terms that's `artist.slice(4)`.
 *
 * @param {string} artist
 * @returns {string} single uppercase A-Z letter, or "#" for anything else
 */
export function artistGroupLabel(artist) {
  const value = artist ?? "";
  const stripped = /^the /i.test(value) ? value.slice(4) : value;
  return firstLetterLabel(stripped);
}

/**
 * Computes the title grouping key for a release. Unlike artist, there is no
 * "The " stripping — a title literally starting with "The" groups under "T".
 *
 * @param {string} title
 * @returns {string} single uppercase A-Z letter, or "#" for anything else
 */
export function titleGroupLabel(title) {
  return firstLetterLabel(title ?? "");
}

/**
 * Uppercases the first character of `value` and returns it if it's an
 * A-Z letter, otherwise returns "#" (covers digits, punctuation, symbols,
 * and empty strings).
 *
 * @param {string} value
 * @returns {string}
 */
function firstLetterLabel(value) {
  const first = value.charAt(0).toUpperCase();
  return first >= "A" && first <= "Z" ? first : "#";
}

/**
 * Computes the year grouping label for a release.
 *
 * @param {number|string|null|undefined} releasedYear
 * @returns {string}
 */
export function yearGroupLabel(releasedYear) {
  return releasedYear === null || releasedYear === undefined
    ? "Unknown Year"
    : String(releasedYear);
}

// Maps a sort field to the function that computes a release's group label
// for that field. Fields not present here (e.g. "date_added") get no
// grouping at all — see groupReleasesBySort below.
const LABEL_COMPUTERS = {
  released_year: (release) => yearGroupLabel(release.released_year),
  artist: (release) => artistGroupLabel(release.artist),
  title: (release) => titleGroupLabel(release.title),
};

/**
 * Chunks an already-sorted `releases` array into an array of section objects
 * `{ label, items }` based on `sortField`.
 *
 * - "date_added" (or any field not in LABEL_COMPUTERS): single ungrouped
 *   section with `label: null`.
 * - "released_year": grouped by release.released_year (or "Unknown Year").
 * - "artist": grouped by the backend-equivalent first-letter-after-"The "-
 *   stripping rule.
 * - "title": grouped by literal first-letter.
 *
 * Since the input is already correctly sorted, this only ever starts a new
 * section when the computed label differs from the previous item's — it
 * never merges non-consecutive runs that happen to share a label.
 *
 * @param {Array<object>} releases
 * @param {string} sortField
 * @returns {Array<{ label: string|null, items: object[] }>}
 */
export function groupReleasesBySort(releases, sortField) {
  const computeLabel = LABEL_COMPUTERS[sortField];

  if (!computeLabel) {
    return [{ label: null, items: releases }];
  }

  const sections = [];
  let currentSection = null;

  for (const release of releases) {
    const label = computeLabel(release);
    if (!currentSection || currentSection.label !== label) {
      currentSection = { label, items: [] };
      sections.push(currentSection);
    }
    currentSection.items.push(release);
  }

  return sections;
}
