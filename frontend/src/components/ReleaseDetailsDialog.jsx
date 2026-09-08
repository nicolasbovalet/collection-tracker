import { useEffect, useState } from "react";
import { Disc3, ExternalLink, Star, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { deleteRelease } from "../api/releases";
import { getDiscogsRelease } from "../api/discogs";
import { sumTrackDurations } from "../utils/discogsFormat";

function DetailsSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <div className="flex gap-4">
        <Skeleton className="size-32 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export default function ReleaseDetailsDialog({
  open,
  onOpenChange,
  discogsId,
  localRelease,
  onDeleted,
}) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    deleteRelease(localRelease.id)
      .then(() => {
        onOpenChange(false);
        onDeleted?.(localRelease.id);
      })
      .catch(() => toast.error("Could not delete this release."));
  };

  useEffect(() => {
    if (!open || !discogsId) return undefined;

    let cancelled = false;
    setDetails(null);
    setError(false);
    setLoading(true);

    getDiscogsRelease(discogsId)
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, discogsId]);

  const totalRuntime = details ? sumTrackDurations(details.tracklist) : null;
  const coverArtUrl = details?.cover_art_url || localRelease?.cover_art_url || "";
  const title = details?.title || localRelease?.title || "";
  const artist = details?.artists?.join(", ") || localRelease?.artist || "";
  const hasCommunityStats =
    details && (details.community_rating_count > 0 || details.have != null || details.want != null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">{title || "Release details"}</DialogTitle>
        </DialogHeader>

        {loading && <DetailsSkeleton />}

        {!loading && error && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Details unavailable from Discogs for this release.
          </p>
        )}

        {!loading && !error && details && (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            <div className="flex gap-4">
              {coverArtUrl ? (
                <img
                  src={coverArtUrl}
                  alt={`${artist} - ${title}`}
                  className="size-32 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex size-32 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Disc3 className="size-10" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg leading-tight font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{artist}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {details.year ? <Badge variant="outline">{details.year}</Badge> : null}
                  {details.format ? <Badge variant="outline">{details.format}</Badge> : null}
                  {details.country ? <Badge variant="outline">{details.country}</Badge> : null}
                  {totalRuntime ? <Badge variant="outline">{totalRuntime}</Badge> : null}
                </div>
              </div>
            </div>

            {(details.genres.length > 0 || details.styles.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {details.genres.map((genre) => (
                  <Badge key={`genre-${genre}`}>{genre}</Badge>
                ))}
                {details.styles.map((style) => (
                  <Badge key={`style-${style}`} variant="secondary">
                    {style}
                  </Badge>
                ))}
              </div>
            )}

            {details.labels.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {details.labels
                  .map((label) => `${label.name}${label.catno ? ` (${label.catno})` : ""}`)
                  .join(", ")}
              </p>
            )}

            {details.tracklist.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Tracklist
                </h3>
                <div className="space-y-0.5">
                  {details.tracklist.map((track, index) =>
                    track.type !== "track" ? (
                      <p
                        key={`${track.position}-${index}`}
                        className="pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                      >
                        {track.title}
                      </p>
                    ) : (
                      <div
                        key={`${track.position}-${index}`}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50"
                      >
                        <span className="w-6 shrink-0 text-muted-foreground">{track.position}</span>
                        <span className="min-w-0 flex-1 truncate">{track.title}</span>
                        {track.duration && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {track.duration}
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {details.notes && (
              <div>
                <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-line text-muted-foreground">{details.notes}</p>
              </div>
            )}

            {localRelease && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Your Copy
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {localRelease.media_condition && (
                      <Badge variant="outline">Media: {localRelease.media_condition}</Badge>
                    )}
                    {localRelease.sleeve_condition && (
                      <Badge variant="outline">Sleeve: {localRelease.sleeve_condition}</Badge>
                    )}
                    {localRelease.personal_rating != null && (
                      <Badge variant="outline">
                        <Star className="size-3" />
                        {localRelease.personal_rating}/5
                      </Badge>
                    )}
                    {localRelease.estimated_value != null && (
                      <Badge variant="outline">
                        ${Number(localRelease.estimated_value).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {localRelease.notes && (
                    <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                      {localRelease.notes}
                    </p>
                  )}
                  {onDeleted && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="mt-3">
                          <Trash2 className="size-3.5" />
                          {localRelease.status === "wishlist"
                            ? "Remove from Wishlist"
                            : "Remove from Collection"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this release?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes &ldquo;{title}&rdquo; from your{" "}
                            {localRelease.status === "wishlist" ? "wishlist" : "collection"}.
                            This can&apos;t be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={handleDelete}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center justify-between gap-4">
              {hasCommunityStats ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {details.community_rating_average ? (
                    <span>
                      {details.community_rating_average.toFixed(1)}/5 (
                      {details.community_rating_count}){details.have != null ? " · " : ""}
                    </span>
                  ) : null}
                  {details.have != null && <span>{details.have} have</span>}
                  {details.want != null && <span>, {details.want} want</span>}
                </div>
              ) : (
                <span />
              )}
              <a
                href={details.discogs_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View on Discogs
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
