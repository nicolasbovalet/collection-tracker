import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";

export default function FolderConflictModal({ open, newFolders, onChoose }) {
  return (
    <Dialog open={open} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <CreateNewFolderIcon color="primary" fontSize="small" />
        New folders found
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <DialogContentText>
          This file references folders: {newFolders.join(", ")}. Create them and
          sort items accordingly, or add everything to a single Main folder?
        </DialogContentText>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => onChoose("main_only")} color="inherit">
          Use Main folder
        </Button>
        <Button variant="contained" color="primary" onClick={() => onChoose("per_folder")}>
          Create folders
        </Button>
      </DialogActions>
    </Dialog>
  );
}
