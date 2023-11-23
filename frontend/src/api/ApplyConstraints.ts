import type { Constraint } from "../shared/architecture/Constraints";
import { formatConstraints } from "../shared/architecture/Constraints";
import type { Architecture } from "../shared/architecture/Architecture";
import { parseArchitecture } from "../shared/architecture/Architecture";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

export async function applyConstraints(
  architectureId: string,
  latestState: number,
  constraints: Constraint[],
  idToken: string,
): Promise<Architecture> {
  console.log("applyConstraints", architectureId);

  const constraintCount: Record<string, number> = {};
  for (const c of constraints) {
    const key = `${c.scope}:${c.operator}`;
    constraintCount[key] = (constraintCount[key] ?? 0) + 1;
  }

  let data: ArrayBuffer;
  try {
    const response = await axios.post(
      `/api/architecture/${architectureId}/run`,
      { constraints: JSON.parse(formatConstraints(constraints)) },
      {
        params: {
          state: latestState,
        },
        responseType: "json",
        decompress: true,
        headers: {
          accept: "application/octet-stream",
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
    data = response.data;
    console.debug("response from apply constraints", data);
  } catch (e: any) {
    const error = new ApiError({
      errorId: "ApplyConstraints",
      message: "An error occurred while applying constraints.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
    });
    trackError(error);
    throw error;
  }

  return parseArchitecture(data);
}
