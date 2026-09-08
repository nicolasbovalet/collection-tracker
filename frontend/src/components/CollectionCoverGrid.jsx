import { Disc3, Music2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function CollectionCoverGrid({ sections, onSelectRelease }) {
  const totalCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  if (totalCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        No releases match the current filters.
      </div>
    );
  }

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <div key={`section-${sectionIndex}`} className="mb-6">
          {section.label && (
            <p className="mb-3 border-b border-border pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {section.label}
            </p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {section.items.map((release) => (
              <Card
                key={release.id}
                size="sm"
                role="button"
                tabIndex={0}
                onClick={() => onSelectRelease(release)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSelectRelease(release);
                }}
                className="cursor-pointer overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {release.cover_art_url ? (
                  <img
                    src={release.cover_art_url}
                    alt={`${release.artist} - ${release.title}`}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center border-b border-border bg-muted text-muted-foreground">
                    <Disc3 className="size-12" strokeWidth={1.5} />
                  </div>
                )}
                <CardContent className="space-y-0.5 py-3">
                  <p className="truncate text-sm font-semibold" title={release.title}>
                    {release.title}
                  </p>
                  <p className="truncate text-sm text-muted-foreground" title={release.artist}>
                    {release.artist}
                  </p>
                  {release.country && (
                    <p className="truncate text-xs text-muted-foreground" title={release.country}>
                      {release.country}
                    </p>
                  )}
                  {release.format && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Music2 className="size-3.5 shrink-0" />
                      <span className="min-w-0 truncate" title={release.format}>
                        {release.format}
                      </span>
                    </div>
                  )}
                  {release.estimated_value !== null && release.estimated_value !== undefined && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ${Number(release.estimated_value).toFixed(2)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
