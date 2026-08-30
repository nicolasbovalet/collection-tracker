import { useCallback, useEffect, useState } from "react";
import AlbumIcon from "@mui/icons-material/Album";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

import { getReleases, moveToCollection } from "../api/releases";
import AddToCollectionDialog from "./AddToCollectionDialog";

export default function WishlistTab() {
  const [items, setItems] = useState([]);
  const [target, setTarget] = useState(null);

  const refresh = useCallback(() => {
    getReleases({ status: "wishlist" }).then(setItems);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = async (payload) => {
    await moveToCollection(target.id, payload);
    setTarget(null);
    refresh();
  };

  if (items.length === 0) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 1, py: 6, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">Your wishlist is empty.</Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <List disablePadding>
          {items.map((item) => (
            <ListItem
              key={item.id}
              divider
              sx={(theme) => ({
                py: 1.5,
                px: { xs: 1.5, sm: 2 },
                gap: 1.5,
                flexWrap: { xs: "wrap", sm: "nowrap" },
                transition: theme.transitions.create("background-color", { duration: 150 }),
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04) },
              })}
              secondaryAction={
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<SwapHorizIcon fontSize="small" />}
                  onClick={() => setTarget(item)}
                >
                  Move to Collection
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar
                  variant="rounded"
                  src={item.cover_art_url || undefined}
                  alt={`${item.artist} - ${item.title} cover art`}
                  sx={(theme) => ({
                    width: 56,
                    height: 56,
                    bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                    color: theme.palette.text.secondary,
                  })}
                >
                  <AlbumIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                sx={{ minWidth: 0, pr: { sm: 20 } }}
                primary={
                  <Typography variant="subtitle2" fontWeight={600} noWrap title={item.title}>
                    {item.title}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      title={item.artist}
                      sx={{ display: "block" }}
                    >
                      {item.artist}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {item.format || "Unknown format"} · {item.released_year || "Unknown year"}
                    </Typography>
                  </>
                }
                secondaryTypographyProps={{ component: "div" }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      <AddToCollectionDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
