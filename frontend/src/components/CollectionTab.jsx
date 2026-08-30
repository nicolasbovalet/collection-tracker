import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import FolderSidebar from "./FolderSidebar";
import CollectionGrid from "./CollectionGrid";

export default function CollectionTab({ refreshKey }) {
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 2,
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          width: { xs: "100%", md: 240 },
          flexShrink: 0,
          borderRadius: 2,
          py: 1,
          maxHeight: { md: "70vh" },
          overflowY: { md: "auto" },
        }}
      >
        <FolderSidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          refreshKey={refreshKey}
        />
      </Paper>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <CollectionGrid folderId={selectedFolderId} refreshKey={refreshKey} />
      </Box>
    </Box>
  );
}
