import type { Architecture } from "../shared/architecture/Architecture";
import { parseArchitecture } from "../shared/architecture/Architecture";
import axios from "axios";

export async function getArchitecture(
  id: string,
  idToken: string,
  version?: number,
): Promise<Architecture> {
  const { data } = await axios.get(`/architecture/${id}`, {
    responseType: "arraybuffer",
    decompress: true,
    headers: {
      accept: "application/octet-stream",
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
    },
  });

  return parseArchitecture(data);
}
