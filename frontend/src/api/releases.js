import client from "./client";

export async function getReleases(params = {}) {
  const response = await client.get("/releases/", { params });
  return response.data;
}

export async function addToWishlist(payload) {
  const response = await client.post("/releases/wishlist/", payload);
  return response.data;
}

export async function addToCollection(payload) {
  const response = await client.post("/releases/collection/", payload);
  return response.data;
}

export async function moveToCollection(id, payload) {
  const response = await client.post(`/releases/${id}/move-to-collection/`, payload);
  return response.data;
}

export async function deleteRelease(id) {
  await client.delete(`/releases/${id}/`);
}
