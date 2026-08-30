import client from "./client";

export async function searchDiscogs(query) {
  const response = await client.get("/discogs/search/", { params: { q: query } });
  return response.data.results;
}
