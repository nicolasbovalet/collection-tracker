import { Card } from "@/components/ui/card";

import SearchResultItem from "./SearchResultItem";

export default function SearchResultsList({ results, onAddToCollection, onWishlisted }) {
  return (
    <Card className="mt-4 mb-6 gap-0 overflow-hidden py-0">
      <div className="border-b border-border bg-accent/50 px-4 py-2.5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {results.length} result{results.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="max-h-[480px] overflow-y-auto">
        {results.map((result) => (
          <SearchResultItem
            key={result.id}
            result={result}
            onAddToCollection={onAddToCollection}
            onWishlisted={onWishlisted}
          />
        ))}
      </div>
    </Card>
  );
}
