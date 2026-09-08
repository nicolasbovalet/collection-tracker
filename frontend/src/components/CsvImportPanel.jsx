import { useState } from "react";
import { CheckCircle2, Download, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    <div className="max-w-md space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Import
        </p>
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border bg-primary/[0.03] px-6 py-8 text-center transition-colors hover:border-primary hover:bg-primary/[0.06]">
          <Upload className="size-5 text-primary" />
          <p className="text-sm font-semibold">
            {file ? file.name : "Choose a Discogs CSV file"}
          </p>
          <p className="text-xs text-muted-foreground">
            {file ? "Click to choose a different file" : "Click to browse"}
          </p>
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={(event) => setFile(event.target.files[0] || null)}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={!file || loading} onClick={handleImportClick}>
          Import
        </Button>
        {loading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      </div>

      {summary && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm">
            Imported {summary.created} releases, skipped {summary.skipped_duplicates}{" "}
            duplicates. Folders created: {summary.folders_created.join(", ") || "none"}.
          </p>
        </div>
      )}

      <FolderConflictModal
        open={Boolean(newFolders)}
        newFolders={newFolders || []}
        onChoose={runCommit}
      />

      <Separator />

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Export
        </p>
        <Button variant="secondary" asChild>
          <a href="/api/export/discogs-csv/">
            <Download className="size-4" />
            Export Collection to CSV
          </a>
        </Button>
      </div>
    </div>
  );
}
