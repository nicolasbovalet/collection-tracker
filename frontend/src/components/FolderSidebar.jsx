import { useEffect, useState } from "react";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import { alpha } from "@mui/material/styles";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import { getFolders } from "../api/folders";

export default function FolderSidebar({ selectedFolderId, onSelectFolder, refreshKey }) {
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    getFolders().then(setFolders);
  }, [refreshKey]);

  // borderRadius: 0.75 preserves the pre-theme-change 6px corner radius
  // (0.75 * theme.shape.borderRadius(8) = 6px, matching the prior
  // 1.5 * 4px = 6px), since the sidebar's list items are deliberately kept
  // slightly tighter-cornered than the 8px used elsewhere.
  const itemSx = (theme) => ({
    borderRadius: 0.75,
    mx: 1,
    mb: 0.25,
    py: 0.5,
    pl: 1,
    borderLeft: "3px solid transparent",
    "&.Mui-selected": {
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.08),
      borderLeftColor: theme.palette.primary.main,
      "&:hover": {
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.12),
      },
    },
  });

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
            variant: "body2",
            fontWeight: selectedFolderId === null ? 600 : 400,
            color: selectedFolderId === null ? "text.primary" : "text.secondary",
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
                variant: "body2",
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? "text.primary" : "text.secondary",
                noWrap: true,
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
