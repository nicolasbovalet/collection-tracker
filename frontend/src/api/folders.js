import client from "./client";

export async function getFolders() {
  const response = await client.get("/folders/");
  return response.data;
}

export async function createFolder(name) {
  const response = await client.post("/folders/", { name });
  return response.data;
}
