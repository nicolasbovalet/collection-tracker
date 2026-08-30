import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { createFolder, getFolders } from "../api/folders";

const CONDITIONS = [
  "Mint", "Near Mint", "Very Good Plus", "Very Good",
  "Good Plus", "Good", "Fair", "Poor",
];

const NEW_FOLDER_VALUE = "__new_folder__";

export default function AddToCollectionDialog({ open, onClose, onSubmit }) {
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [mediaCondition, setMediaCondition] = useState("");
  const [sleeveCondition, setSleeveCondition] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) getFolders().then(setFolders);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFolderId("");
      setNewFolderName("");
      setMediaCondition("");
      setSleeveCondition("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    let resolvedFolderId = folderId;
    if (folderId === NEW_FOLDER_VALUE) {
      const created = await createFolder(newFolderName.trim());
      resolvedFolderId = created.id;
    }
    onSubmit({
      folder: resolvedFolderId,
      media_condition: mediaCondition || null,
      sleeve_condition: sleeveCondition || null,
      notes,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add to Collection</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Folder"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
          >
            {folders.map((folder) => (
              <MenuItem key={folder.id} value={folder.id}>
                {folder.name}
              </MenuItem>
            ))}
            <MenuItem value={NEW_FOLDER_VALUE}>+ Create new folder</MenuItem>
          </TextField>
          {folderId === NEW_FOLDER_VALUE && (
            <TextField
              label="New folder name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
            />
          )}
          <TextField
            select
            label="Media Condition"
            value={mediaCondition}
            onChange={(event) => setMediaCondition(event.target.value)}
          >
            {CONDITIONS.map((condition) => (
              <MenuItem key={condition} value={condition}>
                {condition}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Sleeve Condition"
            value={sleeveCondition}
            onChange={(event) => setSleeveCondition(event.target.value)}
          >
            {CONDITIONS.map((condition) => (
              <MenuItem key={condition} value={condition}>
                {condition}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Notes"
            multiline
            minRows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!folderId || (folderId === NEW_FOLDER_VALUE && !newFolderName.trim())}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
