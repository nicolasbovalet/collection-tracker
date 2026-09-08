import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            Add to Collection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Location
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="folder">Folder</Label>
              <Select
                value={folderId}
                onValueChange={(value) => {
                  setFolderId(value);
                  setNewFolderError("");
                }}
              >
                <SelectTrigger id="folder" className="w-full">
                  <SelectValue placeholder="Choose a folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_FOLDER_VALUE}>+ Create new folder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {folderId === NEW_FOLDER_VALUE && (
              <div className="space-y-1.5">
                <Label htmlFor="new-folder-name">New folder name</Label>
                <Input
                  id="new-folder-name"
                  value={newFolderName}
                  onChange={(event) => {
                    setNewFolderName(event.target.value);
                    setNewFolderError("");
                  }}
                  aria-invalid={Boolean(newFolderError)}
                  autoFocus
                />
                {newFolderError && (
                  <p className="text-xs text-destructive">{newFolderError}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Condition
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="media-condition">Media Condition</Label>
                <Select value={mediaCondition} onValueChange={setMediaCondition}>
                  <SelectTrigger id="media-condition" className="w-full">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="sleeve-condition">Sleeve Condition</Label>
                <Select value={sleeveCondition} onValueChange={setSleeveCondition}>
                  <SelectTrigger id="sleeve-condition" className="w-full">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!folderId || (folderId === NEW_FOLDER_VALUE && !newFolderName.trim())}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
