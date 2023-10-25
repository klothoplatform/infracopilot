import type { Architecture } from "../shared/architecture/Architecture";
import axios from "axios";

export async function listArchitectures(
  idToken: string,
): Promise<Architecture[]> {
  console.log("listingArchitectures");
  let data;

  const response = await axios.get(`/api/architectures`, {
    headers: {
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
    },
  });
  data = response.data;
  const architectures = JSON.parse(data).architectures;
  return architectures;
}
