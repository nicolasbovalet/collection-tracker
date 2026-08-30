import { useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

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
    const result = await commitImport(file, folderMode);
    setLoading(false);
    setSummary(result);
  };

  const handleImportClick = async () => {
    if (!file) return;
    setLoading(true);
    setSummary(null);
    const result = await dryRunImport(file);
    setLoading(false);
    if (result.new_folders.length > 0) {
      setNewFolders(result.new_folders);
    } else {
      await runCommit("per_folder");
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <input
        type="file"
        accept=".csv"
        onChange={(event) => setFile(event.target.files[0] || null)}
      />
      <Button variant="contained" disabled={!file || loading} onClick={handleImportClick}>
        Import
      </Button>
      {loading && <CircularProgress size={24} />}
      {summary && (
        <Typography>
          Imported {summary.created} releases, skipped {summary.skipped_duplicates}{" "}
          duplicates. Folders created: {summary.folders_created.join(", ") || "none"}.
        </Typography>
      )}
      <FolderConflictModal
        open={Boolean(newFolders)}
        newFolders={newFolders || []}
        onChoose={runCommit}
      />
    </Stack>
  );
}
