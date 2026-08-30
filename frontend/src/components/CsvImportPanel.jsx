import { useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

import { commitImport, dryRunImport } from "../api/importCsv";
import FolderConflictModal from "./FolderConflictModal";

export default function CsvImportPanel() {
  const [file, setFile] = useState(null);
  const [newFolders, setNewFolders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const runCommit = async (folderMode) => {
    setNewFolders(null);
    setLoading(true);
    try {
      const result = await commitImport(file, folderMode);
      setSummary(result);
    } catch (error) {
      // Leave summary unset; loading is always reset in finally below.
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = async () => {
    if (!file) return;
    setLoading(true);
    setSummary(null);
    try {
      const result = await dryRunImport(file);
      if (result.new_folders.length > 0) {
        setNewFolders(result.new_folders);
      } else {
        await runCommit("per_folder");
      }
    } catch (error) {
      // Leave summary unset; loading is always reset in finally below.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 480 }}>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Import
        </Typography>
        <Paper
          variant="outlined"
          component="label"
          sx={(theme) => ({
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            px: 3,
            py: 4,
            borderStyle: "dashed",
            borderRadius: 2,
            cursor: "pointer",
            textAlign: "center",
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.04 : 0.03),
            transition: theme.transitions.create(["background-color", "border-color"]),
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            "&:hover": {
              borderColor: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.06),
            },
          })}
        >
          <CloudUploadIcon color="primary" />
          <Typography variant="body2" fontWeight={600}>
            {file ? file.name : "Choose a Discogs CSV file"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {file ? "Click to choose a different file" : "Click to browse"}
          </Typography>
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={(event) => setFile(event.target.files[0] || null)}
          />
        </Paper>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <Button variant="contained" color="primary" disabled={!file || loading} onClick={handleImportClick}>
          Import
        </Button>
        {loading && <CircularProgress size={24} />}
      </Stack>

      {summary && (
        <Paper
          variant="outlined"
          sx={(theme) => ({
            p: 2,
            borderRadius: 2,
            borderColor: alpha(theme.palette.success.main, 0.4),
            bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.08 : 0.06),
          })}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.25 }} />
            <Typography variant="body2">
              Imported {summary.created} releases, skipped {summary.skipped_duplicates}{" "}
              duplicates. Folders created: {summary.folders_created.join(", ") || "none"}.
            </Typography>
          </Stack>
        </Paper>
      )}

      <FolderConflictModal
        open={Boolean(newFolders)}
        newFolders={newFolders || []}
        onChoose={runCommit}
      />

      <Divider />

      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Export
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          component="a"
          href="/api/export/discogs-csv/"
          startIcon={<DownloadIcon />}
        >
          Export Collection to CSV
        </Button>
      </Box>
    </Stack>
  );
}
