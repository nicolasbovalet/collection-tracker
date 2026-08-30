import { useEffect, useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";

import { getReleases } from "../api/releases";
import useDebouncedValue from "../hooks/useDebouncedValue";
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
];

export default function CollectionGrid({ folderId, refreshKey }) {
  const [releases, setReleases] = useState([]);
  const [sort, setSort] = useState({ field: "artist", direction: "asc" });
  const [viewMode, setViewMode] = useState("table");
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

  return (
    <>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <CollectionFilterBar filters={filters} onChange={setFilters} />
        <Stack direction="row" spacing={1} alignItems="center">
          <CollectionSortMenu sort={sort} onChange={setSort} />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(_, value) => {
              if (value) setViewMode(value);
            }}
          >
            <ToggleButton value="table" aria-label="Table view">
              <TableRowsIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="cover" aria-label="Cover art grid view">
              <ViewModuleIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
      {viewMode === "cover" ? (
        <CollectionCoverGrid releases={releases} />
      ) : releases.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            py: 6,
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">No releases match the current filters.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        bgcolor: "action.hover",
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{
                    bgcolor: index % 2 === 1 ? "action.hover" : "transparent",
                    "&:last-child td": { borderBottom: 0 },
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} sx={{ whiteSpace: "nowrap" }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
