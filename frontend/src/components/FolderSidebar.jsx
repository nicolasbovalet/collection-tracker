import { useEffect, useState } from "react";
import { Folder, FolderOpen, Library } from "lucide-react";

import { cn } from "@/lib/utils";

import { getFolders } from "../api/folders";

function FolderItem({ isSelected, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border-l-2 border-transparent py-1.5 pr-2 pl-2.5 text-left text-sm transition-colors",
        isSelected
          ? "border-l-primary bg-primary/10 font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export default function FolderSidebar({ selectedFolderId, onSelectFolder, refreshKey }) {
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    getFolders().then(setFolders);
  }, [refreshKey]);

  return (
    <div className="space-y-0.5 px-1">
      <p className="px-2.5 pt-0.5 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Folders
      </p>
      <FolderItem
        isSelected={selectedFolderId === null}
        icon={
          <Library
            className={cn("size-4 shrink-0", selectedFolderId === null && "text-primary")}
          />
        }
        label="All Folders"
        onClick={() => onSelectFolder(null)}
      />
      {folders.map((folder) => {
        const isSelected = selectedFolderId === folder.id;
        const Icon = isSelected ? FolderOpen : Folder;
        return (
          <FolderItem
            key={folder.id}
            isSelected={isSelected}
            icon={<Icon className={cn("size-4 shrink-0", isSelected && "text-primary")} />}
            label={folder.name}
            onClick={() => onSelectFolder(folder.id)}
          />
        );
      })}
    </div>
  );
}
