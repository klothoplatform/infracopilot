import { analytics } from "../App";
import type { Architecture } from "../shared/architecture/Architecture";
import { parseArchitecture } from "../shared/architecture/Architecture";
import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

export async function getPrevState(
  id: string,
  idToken: string,
  version: number,
): Promise<Architecture | undefined> {
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/architecture/${id}/version/${version}/prev`,
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
    if (e.response.status === 404) {
      return undefined;
    }
    const error = new ApiError({
      errorId: "GetPreviousState",
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

  analytics.track("GetPreviousState", { status: response.status, id });
  return parseArchitecture(response.data);
}
