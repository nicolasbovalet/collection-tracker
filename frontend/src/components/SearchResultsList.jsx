import List from "@mui/material/List";

import SearchResultItem from "./SearchResultItem";

export default function SearchResultsList({ results, onAddToCollection, onWishlisted }) {
  return (
    <List>
      {results.map((result) => (
        <SearchResultItem
          key={result.id}
          result={result}
          onAddToCollection={onAddToCollection}
          onWishlisted={onWishlisted}
        />
      ))}
    </List>
  );
}
