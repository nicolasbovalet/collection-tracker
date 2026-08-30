export function parseArtistTitle(rawTitle) {
  const [artist, ...rest] = rawTitle.split(" - ");
  return { artist: artist || "", title: rest.join(" - ") || rawTitle };
}
