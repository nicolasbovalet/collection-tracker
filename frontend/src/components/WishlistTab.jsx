import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

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

  return (
    <>
      <List>
        {items.map((item) => (
          <ListItem
            key={item.id}
            secondaryAction={
              <Button variant="contained" size="small" onClick={() => setTarget(item)}>
                Move to Collection
              </Button>
            }
          >
            <ListItemText
              primary={`${item.artist} - ${item.title}`}
              secondary={`${item.format} · ${item.released_year || "Unknown year"}`}
            />
          </ListItem>
        ))}
      </List>
      <AddToCollectionDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
