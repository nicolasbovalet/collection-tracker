import { useEffect, useState } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

import { getFolders } from "../api/folders";

export default function FolderSidebar({ selectedFolderId, onSelectFolder }) {
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    getFolders().then(setFolders);
  }, []);

  return (
    <List>
      <ListItemButton
        selected={selectedFolderId === null}
        onClick={() => onSelectFolder(null)}
      >
        <ListItemText primary="All Folders" />
      </ListItemButton>
      {folders.map((folder) => (
        <ListItemButton
          key={folder.id}
          selected={selectedFolderId === folder.id}
          onClick={() => onSelectFolder(folder.id)}
        >
          <ListItemText primary={folder.name} />
        </ListItemButton>
      ))}
    </List>
  );
}
