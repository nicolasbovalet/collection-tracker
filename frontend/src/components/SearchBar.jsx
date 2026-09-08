import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

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
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search Discogs"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-11 rounded-xl pl-9 shadow-xs focus-visible:ring-4 focus-visible:ring-primary/15"
      />
    </div>
  );
}
