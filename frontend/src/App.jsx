import { useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

export default function App() {
  const [tab, setTab] = useState("collection");

  return (
    <Box>
      <Typography variant="h5" sx={{ p: 2 }}>
        Collection Tracker
      </Typography>
      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        <Tab label="Collection" value="collection" />
        <Tab label="Wishlist" value="wishlist" />
        <Tab label="Import" value="import" />
      </Tabs>
      <Box sx={{ p: 2 }}>
        {tab === "collection" && <Typography>Collection view coming soon.</Typography>}
        {tab === "wishlist" && <Typography>Wishlist view coming soon.</Typography>}
        {tab === "import" && <Typography>Import view coming soon.</Typography>}
      </Box>
    </Box>
  );
}
