import AlbumIcon from "@mui/icons-material/Album";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

import { addToWishlist } from "../api/releases";
import { parseArtistTitle } from "../utils/discogsFormat";

export default function SearchResultItem({ result, onAddToCollection, onWishlisted }) {
  const { artist, title } = parseArtistTitle(result.title);

  const handleAddToWishlist = async () => {
    await addToWishlist({
      discogs_release_id: result.id,
      artist,
      title,
      format: (result.format || []).join(", "),
      released_year: result.year || null,
      cover_art_url: result.cover_image || result.thumb || "",
      country: result.country || "",
      genre: (result.genre || []).join(", "),
    });
    onWishlisted(result.id);
  };

  return (
    <ListItem
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
    >
      <ListItemAvatar>
        <Avatar
          variant="rounded"
          src={result.thumb}
          alt={`${artist} - ${title} cover art`}
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
        sx={{ minWidth: 0 }}
        primary={
          <Typography variant="subtitle2" fontWeight={600} noWrap title={title}>
            {title}
          </Typography>
        }
        secondary={
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              title={artist}
              sx={{ display: "block" }}
            >
              {artist}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {(result.format || []).join(", ") || "Unknown format"} · {result.year || "Unknown year"}
            </Typography>
          </>
        }
        secondaryTypographyProps={{ component: "div" }}
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexShrink: 0, ml: { xs: "auto", sm: 0 } }}
      >
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          startIcon={<FavoriteBorderIcon fontSize="small" />}
          onClick={handleAddToWishlist}
        >
          Add to Wishlist
        </Button>
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<LibraryAddIcon fontSize="small" />}
          onClick={() => onAddToCollection(result)}
        >
          Add to Collection
        </Button>
      </Stack>
    </ListItem>
  );
}
