import { useEffect, useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { alpha } from "@mui/material/styles";
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
            sx={(theme) => ({
              "& .MuiToggleButton-root": {
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
              },
              "& .Mui-selected": {
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.18),
                },
              },
            })}
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
        <CollectionCoverGrid sections={sections} />
      ) : releases.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 1,
            py: 6,
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">No releases match the current filters.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={(theme) => ({
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        bgcolor: theme.palette.background.paper,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.secondary,
                      })}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {groupedTableRows.map((item) =>
                item.type === "header" ? (
                  <TableRow key={item.key}>
                    <TableCell
                      colSpan={columns.length}
                      sx={(theme) => ({
                        fontWeight: 700,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(15,23,42,0.03)",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      })}
                    >
                      {item.label}
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    key={item.key}
                    sx={(theme) => ({
                      bgcolor:
                        item.index % 2 === 1
                          ? theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(15,23,42,0.015)"
                          : "transparent",
                      "&:last-child td": { borderBottom: 0 },
                      "&:hover": {
                        bgcolor: alpha(
                          theme.palette.primary.main,
                          theme.palette.mode === "dark" ? 0.08 : 0.06
                        ),
                      },
                    })}
                  >
                    {item.row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} sx={{ whiteSpace: "nowrap" }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
