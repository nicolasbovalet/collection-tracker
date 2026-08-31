import client from "./client";

export async function getStats() {
  const response = await client.get("/stats/");
  return response.data;
}
