import { useCallback, useState } from "react";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

import CollectionTab from "./components/CollectionTab";
import SearchBar from "./components/SearchBar";
import SearchResultsList from "./components/SearchResultsList";

export default function App() {
  const [tab, setTab] = useState("collection");
  const [searchResults, setSearchResults] = useState([]);
  const [wishlistedMessage, setWishlistedMessage] = useState("");

  const handleResults = useCallback((results) => setSearchResults(results), []);
  const handleWishlisted = useCallback(
    () => setWishlistedMessage("Added to wishlist"),
    []
  );
  const handleAddToCollection = useCallback((result) => {
    console.log("open add-to-collection dialog for", result);
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ p: 2 }}>
        Collection Tracker
      </Typography>
      <Box sx={{ px: 2 }}>
        <SearchBar onResults={handleResults} />
        {searchResults.length > 0 && (
          <SearchResultsList
            results={searchResults}
            onAddToCollection={handleAddToCollection}
            onWishlisted={handleWishlisted}
          />
        )}
      </Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        <Tab label="Collection" value="collection" />
        <Tab label="Wishlist" value="wishlist" />
        <Tab label="Import" value="import" />
      </Tabs>
      <Box sx={{ p: 2 }}>
        {tab === "collection" && <CollectionTab />}
        {tab === "wishlist" && <Typography>Wishlist view coming soon.</Typography>}
        {tab === "import" && <Typography>Import view coming soon.</Typography>}
      </Box>
      <Snackbar
        open={Boolean(wishlistedMessage)}
        autoHideDuration={3000}
        onClose={() => setWishlistedMessage("")}
        message={wishlistedMessage}
      />
    </Box>
  );
}
