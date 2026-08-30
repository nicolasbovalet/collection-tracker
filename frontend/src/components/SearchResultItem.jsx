import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";

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
    });
    onWishlisted(result.id);
  };

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar variant="square" src={result.thumb} />
      </ListItemAvatar>
      <ListItemText
        primary={`${artist} - ${title}`}
        secondary={`${(result.format || []).join(", ")} · ${result.year || "Unknown year"}`}
      />
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={handleAddToWishlist}>
          Add to Wishlist
        </Button>
        <Button size="small" variant="contained" onClick={() => onAddToCollection(result)}>
          Add to Collection
        </Button>
      </Stack>
    </ListItem>
  );
}
