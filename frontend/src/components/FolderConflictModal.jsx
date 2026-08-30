import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function FolderConflictModal({ open, newFolders, onChoose }) {
  return (
    <Dialog open={open}>
      <DialogTitle>New folders found</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This file references folders: {newFolders.join(", ")}. Create them and
          sort items accordingly, or add everything to a single Main folder?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onChoose("main_only")}>Use Main folder</Button>
        <Button variant="contained" onClick={() => onChoose("per_folder")}>
          Create folders
        </Button>
      </DialogActions>
    </Dialog>
  );
}
