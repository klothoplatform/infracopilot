import { analytics } from "../App";
import type { Architecture } from "../shared/architecture/Architecture";
import { parseArchitecture } from "../shared/architecture/Architecture";
import axios from "axios";

export async function getArchitecture(
  id: string,
  idToken: string,
  version?: number,
): Promise<Architecture> {
  const response = await axios.get(`/api/architecture/${id}`, {
    responseType: "arraybuffer",
    decompress: true,
    headers: {
      accept: "application/octet-stream",
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
    },
  });
  analytics.track("GetArchitecture", {status: response.status, id })
  if (response.status !== 200) {
    throw new Error("GetArchitecture failed");
  }

  return parseArchitecture(response.data);
}
