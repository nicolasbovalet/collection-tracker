import { Disc3, Heart, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

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
      country: result.country || "",
      genre: (result.genre || []).join(", "),
    });
    onWishlisted(result.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:bg-accent/50 sm:flex-nowrap sm:px-4">
      {result.thumb ? (
        <img
          src={result.thumb}
          alt={`${artist} - ${title} cover art`}
          className="size-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Disc3 className="size-6" strokeWidth={1.5} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={title}>
          {title}
        </p>
        <p className="truncate text-sm text-muted-foreground" title={artist}>
          {artist}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {(result.format || []).join(", ") || "Unknown format"} · {result.year || "Unknown year"}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 gap-2 sm:ml-0">
        <Button variant="secondary" size="sm" onClick={handleAddToWishlist}>
          <Heart className="size-3.5" />
          Add to Wishlist
        </Button>
        <Button size="sm" onClick={() => onAddToCollection(result)}>
          <Plus className="size-3.5" />
          Add to Collection
        </Button>
      </div>
    </div>
  );
}
