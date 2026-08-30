import { useEffect, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { alpha } from "@mui/material/styles";

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
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
          </InputAdornment>
        ),
      }}
      sx={(theme) => ({
        "& .MuiOutlinedInput-root": {
          borderRadius: 3,
          bgcolor: "background.paper",
          transition: theme.transitions.create(["box-shadow"]),
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
        },
      })}
    />
  );
}
