import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { getReleases } from "../api/releases";

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
  const [sorting, setSorting] = useState([]);

  useEffect(() => {
    const params = { status: "collection" };
    if (folderId) params.folder = folderId;
    getReleases(params).then(setReleases);
  }, [folderId, refreshKey]);

  const table = useReactTable({
    data: releases,
    columns: useMemo(() => columns, []),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (releases.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          py: 6,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">No releases in this folder yet.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small" sx={{ minWidth: 640 }}>
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortDirection = header.column.getIsSorted();
                return (
                  <TableCell
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    sx={{
                      cursor: "pointer",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      bgcolor: "action.hover",
                      userSelect: "none",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          color: sortDirection ? "text.primary" : "action.disabled",
                        }}
                      >
                        {sortDirection === "asc" && <ArrowUpwardIcon sx={{ fontSize: 16 }} />}
                        {sortDirection === "desc" && <ArrowDownwardIcon sx={{ fontSize: 16 }} />}
                        {!sortDirection && <UnfoldMoreIcon sx={{ fontSize: 16 }} />}
                      </Box>
                    </Stack>
                  </TableCell>
                );
              })}
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
  );
}
