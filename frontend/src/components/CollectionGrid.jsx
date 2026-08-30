import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

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

  return (
    <Table size="small">
      <TableHead>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableCell
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                sx={{ cursor: "pointer", fontWeight: "bold" }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableHead>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
