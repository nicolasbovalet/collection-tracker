import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Disc3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
      <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Your wishlist is empty.
      </div>
    );
  }

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:bg-accent/50 sm:flex-nowrap sm:px-4"
          >
            {item.cover_art_url ? (
              <img
                src={item.cover_art_url}
                alt={`${item.artist} - ${item.title} cover art`}
                className="size-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Disc3 className="size-6" strokeWidth={1.5} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={item.title}>
                {item.title}
              </p>
              <p className="truncate text-sm text-muted-foreground" title={item.artist}>
                {item.artist}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {item.format || "Unknown format"} · {item.released_year || "Unknown year"}
              </p>
            </div>
            <Button
              size="sm"
              className="ml-auto shrink-0 sm:ml-0"
              onClick={() => setTarget(item)}
            >
              <ArrowLeftRight className="size-3.5" />
              Move to Collection
            </Button>
          </div>
        ))}
      </Card>
      <AddToCollectionDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
