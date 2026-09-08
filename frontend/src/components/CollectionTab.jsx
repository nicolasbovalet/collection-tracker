import { useState } from "react";

import FolderSidebar from "./FolderSidebar";
import CollectionGrid from "./CollectionGrid";

export default function CollectionTab({ refreshKey }) {
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="shrink-0 rounded-lg border border-border py-2 md:w-60 md:max-h-[70vh] md:overflow-y-auto">
        <FolderSidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          refreshKey={refreshKey}
        />
      </div>
      <div className="min-w-0 flex-1">
        <CollectionGrid folderId={selectedFolderId} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
