export function parseArtistTitle(rawTitle) {
  const [artist, ...rest] = rawTitle.split(" - ");
  return { artist: artist || "", title: rest.join(" - ") || rawTitle };
}

// Sums Discogs tracklist "duration" strings (e.g. "4:44") into a single
// mm:ss (or h:mm:ss) total runtime. Returns null when no track has a
// parseable duration, since Discogs frequently leaves this field blank.
export function sumTrackDurations(tracklist) {
  if (!tracklist || tracklist.length === 0) return null;

  let totalSeconds = 0;
  let foundAny = false;

  for (const track of tracklist) {
    const parts = (track.duration || "").split(":").map(Number);
    if (parts.length < 2 || parts.some(Number.isNaN)) continue;
    foundAny = true;
    totalSeconds += parts.reduce((acc, part) => acc * 60 + part, 0);
  }

  if (!foundAny) return null;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
}
