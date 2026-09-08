import { FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FolderConflictModal({ open, newFolders, onChoose }) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="size-4 text-primary" />
            New folders found
          </DialogTitle>
          <DialogDescription>
            This file references folders: {newFolders.join(", ")}. Create them and
            sort items accordingly, or add everything to a single Main folder?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onChoose("main_only")}>
            Use Main folder
          </Button>
          <Button onClick={() => onChoose("per_folder")}>Create folders</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
