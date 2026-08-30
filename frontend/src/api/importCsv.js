import client from "./client";

export async function dryRunImport(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await client.post("/import/discogs-csv/dry-run/", formData);
  return response.data;
}

export async function commitImport(file, folderMode) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder_mode", folderMode);
  const response = await client.post("/import/discogs-csv/commit/", formData);
  return response.data;
}
