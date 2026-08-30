import { useEffect, useState } from "react";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import { getFolders } from "../api/folders";

export default function FolderSidebar({ selectedFolderId, onSelectFolder }) {
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    getFolders().then(setFolders);
  }, []);

  const itemSx = {
    borderRadius: 1.5,
    mx: 1,
    mb: 0.5,
    "&.Mui-selected": {
      bgcolor: "action.selected",
      "&:hover": { bgcolor: "action.selected" },
    },
  };

  return (
    <List
      dense
      disablePadding
      subheader={
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: "block", px: 2, pt: 0.5, pb: 1 }}
        >
          Folders
        </Typography>
      }
    >
      <ListItemButton
        selected={selectedFolderId === null}
        onClick={() => onSelectFolder(null)}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <LibraryMusicIcon fontSize="small" color={selectedFolderId === null ? "primary" : "action"} />
        </ListItemIcon>
        <ListItemText
          primary="All Folders"
          primaryTypographyProps={{
            fontWeight: selectedFolderId === null ? 600 : 400,
          }}
        />
      </ListItemButton>
      {folders.map((folder) => {
        const isSelected = selectedFolderId === folder.id;
        return (
          <ListItemButton
            key={folder.id}
            selected={isSelected}
            onClick={() => onSelectFolder(folder.id)}
            sx={itemSx}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {isSelected ? (
                <FolderOpenIcon fontSize="small" color="primary" />
              ) : (
                <FolderIcon fontSize="small" color="action" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={folder.name}
              primaryTypographyProps={{
                fontWeight: isSelected ? 600 : 400,
                noWrap: true,
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
