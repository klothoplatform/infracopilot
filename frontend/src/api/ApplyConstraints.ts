import type { Constraint } from "../shared/architecture/Constraints";
import { formatConstraints } from "../shared/architecture/Constraints";
import type { Architecture } from "../shared/architecture/Architecture";
import { parseArchitecture } from "../shared/architecture/Architecture";
import axios from "axios";

export async function applyConstraints(
  architectureId: string,
  latestState: number,
  constraints: Constraint[],
  idToken: string,
): Promise<Architecture> {
  console.log("applyConstraints", architectureId);
  let data;

  const response = await axios.post(
    `/architecture/${architectureId}/run`,
    { constraints: JSON.parse(formatConstraints(constraints)) },
    {
      params: {
        state: latestState,
      },
      responseType: "arraybuffer",
      decompress: true,
      headers: {
        accept: "application/octet-stream",
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
      validateStatus: (status) => status === 200 || status === 400,
    },
  );
  data = response.data;

  console.debug("response from apply constraints", response);
  if (response.status === 400) {
    console.error(new TextDecoder().decode(data));
  }
  return parseArchitecture(data);
}
