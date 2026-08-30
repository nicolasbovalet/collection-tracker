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
