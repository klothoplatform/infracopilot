import { analytics } from "../App";
import type { Architecture } from "../shared/architecture/Architecture";
import { parseArchitecture } from "../shared/architecture/Architecture";
import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

export async function setCurrentState(
  id: string,
  idToken: string,
  version: number,
): Promise<void> {
  console.log(idToken);
  let response: AxiosResponse;
  try {
    response = await axios.post(
      `/api/architecture/${id}/version/${version}/set`,
      {},
      {
        responseType: "json",
        decompress: true,
        headers: {
          accept: "application/octet-stream",
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
  } catch (e: any) {
    const error = new ApiError({
      errorId: "SetCurrentState",
      message: "An error occurred while getting architecture.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id: id,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("SetCurrentState", { status: response.status, id });
  return;
}
