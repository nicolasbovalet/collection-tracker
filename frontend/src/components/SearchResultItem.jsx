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
    });
    onWishlisted(result.id);
  };

  return (
    <ListItem
      divider
      sx={{
        py: 1.5,
        px: { xs: 1.5, sm: 2 },
        gap: 1.5,
        flexWrap: { xs: "wrap", sm: "nowrap" },
        transition: "background-color 150ms ease",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <ListItemAvatar>
        <Avatar
          variant="rounded"
          src={result.thumb}
          alt={`${artist} - ${title} cover art`}
          sx={{ width: 56, height: 56, bgcolor: "action.selected" }}
        >
          <AlbumIcon color="disabled" />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        sx={{ minWidth: 0 }}
        primary={
          <Typography variant="subtitle2" noWrap title={`${artist} - ${title}`}>
            {artist} <Typography component="span" color="text.secondary">— {title}</Typography>
          </Typography>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {(result.format || []).join(", ") || "Unknown format"} · {result.year || "Unknown year"}
          </Typography>
        }
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexShrink: 0, ml: { xs: "auto", sm: 0 } }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<FavoriteBorderIcon fontSize="small" />}
          onClick={handleAddToWishlist}
        >
          Add to Wishlist
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<LibraryAddIcon fontSize="small" />}
          onClick={() => onAddToCollection(result)}
        >
          Add to Collection
        </Button>
      </Stack>
    </ListItem>
  );
}
