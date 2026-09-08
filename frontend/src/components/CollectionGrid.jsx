import { useEffect, useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { LayoutGrid, TableIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { getReleases } from "../api/releases";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { groupReleasesBySort } from "../utils/groupReleases";
import CollectionCoverGrid from "./CollectionCoverGrid";
import CollectionFilterBar from "./CollectionFilterBar";
import CollectionSortMenu from "./CollectionSortMenu";

const columns = [
  { accessorKey: "artist", header: "Artist" },
  { accessorKey: "title", header: "Title" },
  { accessorKey: "format", header: "Format" },
  { accessorKey: "media_condition", header: "Media" },
  { accessorKey: "sleeve_condition", header: "Sleeve" },
  { accessorKey: "personal_rating", header: "Rating" },
  { accessorKey: "released_year", header: "Year" },
  {
    accessorKey: "estimated_value",
    header: "Value",
    cell: (info) => {
      const value = info.getValue();
      return value !== null && value !== undefined ? `$${Number(value).toFixed(2)}` : "—";
    },
  },
];

export default function CollectionGrid({ folderId, refreshKey }) {
  const [releases, setReleases] = useState([]);
  const [sort, setSort] = useState({ field: "artist", direction: "asc" });
  const [viewMode, setViewMode] = useState("cover");
  const [filters, setFilters] = useState({
    format: "",
    artist: "",
    condition: "",
    rating: "",
    year: "",
  });
  const debouncedFilters = useDebouncedValue(filters, 400);

  useEffect(() => {
    const params = { status: "collection" };
    if (folderId) params.folder = folderId;
    if (debouncedFilters.format) params.format = debouncedFilters.format;
    if (debouncedFilters.artist) params.artist = debouncedFilters.artist;
    if (debouncedFilters.condition) params.condition = debouncedFilters.condition;
    if (debouncedFilters.rating) params.rating = debouncedFilters.rating;
    if (debouncedFilters.year) params.year = debouncedFilters.year;
    params.ordering = sort.direction === "desc" ? `-${sort.field}` : sort.field;
    getReleases(params).then(setReleases);
  }, [folderId, refreshKey, debouncedFilters, sort]);

  const table = useReactTable({
    data: releases,
    columns: useMemo(() => columns, []),
    getCoreRowModel: getCoreRowModel(),
  });

  const sections = useMemo(
    () => groupReleasesBySort(releases, sort.field),
    [releases, sort.field]
  );

  // Walk the table's row model (whose order matches `releases`/`sort`
  // exactly) and slice out the contiguous chunk of rows belonging to each
  // section, interleaving section header rows in between.
  const tableRows = table.getRowModel().rows;
  const groupedTableRows = [];
  {
    let cursor = 0;
    for (const section of sections) {
      if (section.label) {
        groupedTableRows.push({ type: "header", key: `header-${cursor}`, label: section.label });
      }
      const chunk = tableRows.slice(cursor, cursor + section.items.length);
      chunk.forEach((row, offset) => {
        groupedTableRows.push({ type: "row", key: row.id, row, index: cursor + offset });
      });
      cursor += section.items.length;
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <CollectionFilterBar filters={filters} onChange={setFilters} />
        <div className="flex items-center gap-2">
          <CollectionSortMenu sort={sort} onChange={setSort} />
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value)}
            variant="outline"
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <TableIcon className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="cover" aria-label="Cover art grid view">
              <LayoutGrid className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      {viewMode === "cover" ? (
        <CollectionCoverGrid sections={sections} />
      ) : releases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No releases match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="min-w-[640px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {groupedTableRows.map((item) =>
                item.type === "header" ? (
                  <TableRow key={item.key} className="hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="bg-muted/50 font-semibold">
                      {item.label}
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={item.key}>
                    {item.row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
