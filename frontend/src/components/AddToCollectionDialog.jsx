import { useEffect, useState } from "react";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

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
  const [newFolderError, setNewFolderError] = useState("");

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

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
      setNewFolderError("");
    }
  }, [open]);

  const handleSubmit = async () => {
    let resolvedFolderId = folderId;
    if (folderId === NEW_FOLDER_VALUE) {
      setNewFolderError("");
      try {
        const created = await createFolder(newFolderName.trim());
        resolvedFolderId = created.id;
      } catch (error) {
        setNewFolderError("A folder with this name already exists. Choose a different name or select it from the list above.");
        return;
      }
    }
    onSubmit({
      folder: resolvedFolderId,
      media_condition: mediaCondition || null,
      sleeve_condition: sleeveCondition || null,
      notes,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3 } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <LibraryAddIcon color="primary" fontSize="small" />
        Add to Collection
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Typography variant="overline" color="text.secondary">
              Location
            </Typography>
            <TextField
              select
              label="Folder"
              value={folderId}
              onChange={(event) => {
                setFolderId(event.target.value);
                setNewFolderError("");
              }}
              fullWidth
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
                onChange={(event) => {
                  setNewFolderName(event.target.value);
                  setNewFolderError("");
                }}
                error={Boolean(newFolderError)}
                helperText={newFolderError || " "}
                fullWidth
                autoFocus
              />
            )}
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="overline" color="text.secondary">
              Condition
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Media Condition"
                value={mediaCondition}
                onChange={(event) => setMediaCondition(event.target.value)}
                fullWidth
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
                fullWidth
              >
                {CONDITIONS.map((condition) => (
                  <MenuItem key={condition} value={condition}>
                    {condition}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="overline" color="text.secondary">
              Notes
            </Typography>
            <TextField
              label="Notes"
              multiline
              minRows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              fullWidth
            />
          </Stack>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
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
