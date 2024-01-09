import { analytics } from "../App";
import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

export async function setCurrentState(
  architectureId: string,
  environment: string,
  idToken: string,
  version: number,
): Promise<void> {
  let response: AxiosResponse;
  try {
    response = await axios.post(
      `/api/architecture/${architectureId}/environment/${environment}`,
      {version: version},
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
        architectureId,
        environment,
        version,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("SetCurrentState", {
    status: response.status,
    architectureId,
    environment,
    version,
  });
  return;
}
