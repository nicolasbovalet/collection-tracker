import { useState } from "react";
import Box from "@mui/material/Box";

import FolderSidebar from "./FolderSidebar";
import CollectionGrid from "./CollectionGrid";

export default function CollectionTab({ refreshKey }) {
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <Box sx={{ width: 220 }}>
        <FolderSidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
        />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <CollectionGrid folderId={selectedFolderId} refreshKey={refreshKey} />
      </Box>
    </Box>
  );
}
