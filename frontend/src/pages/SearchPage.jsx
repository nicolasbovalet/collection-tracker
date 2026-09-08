import { useCallback, useState } from "react";
import { toast } from "sonner";

import AddToCollectionDialog from "../components/AddToCollectionDialog";
import ReleaseDetailsDialog from "../components/ReleaseDetailsDialog";
import SearchBar from "../components/SearchBar";
import SearchResultsList from "../components/SearchResultsList";
import { addToCollection } from "../api/releases";
import { parseArtistTitle } from "../utils/discogsFormat";

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState([]);
  const [addToCollectionTarget, setAddToCollectionTarget] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);

  const handleResults = useCallback((results) => setSearchResults(results), []);
  const handleWishlisted = useCallback(() => toast.success("Added to wishlist"), []);
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
      genre: (addToCollectionTarget.genre || []).join(", "),
      ...dialogPayload,
    });
    setAddToCollectionTarget(null);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Search</h1>
      <SearchBar onResults={handleResults} />
      {searchResults.length > 0 ? (
        <SearchResultsList
          results={searchResults}
          onAddToCollection={handleAddToCollection}
          onWishlisted={handleWishlisted}
          onSelectResult={setSelectedResult}
        />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Search Discogs to add releases to your wishlist or collection.
        </p>
      )}
      <AddToCollectionDialog
        open={Boolean(addToCollectionTarget)}
        onClose={() => setAddToCollectionTarget(null)}
        onSubmit={handleDialogSubmit}
      />
      <ReleaseDetailsDialog
        open={Boolean(selectedResult)}
        onOpenChange={(next) => !next && setSelectedResult(null)}
        discogsId={selectedResult?.id}
      />
    </div>
  );
}
