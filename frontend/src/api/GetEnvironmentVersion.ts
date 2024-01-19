import { analytics } from "../App";
import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import {
  type EnvironmentVersion,
  parseEnvironmentVersion,
} from "../shared/architecture/EnvironmentVersion";

export async function getEnvironmentVersion(
  architectureId: string,
  idToken: string,
  environment?: string,
  version?: number,
): Promise<EnvironmentVersion> {
  let response: AxiosResponse;
  environment = environment || "default";
  try {
    response = await axios.get(
      `/api/architecture/${architectureId}/environment/${environment}`,
      {
        params: version && { version: version },
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
      errorId: "GetEnvironmentVersion",
      message: "An error occurred while getting environment version.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id: architectureId,
        environment,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("GetEnvironmentVersion", {
    status: response.status,
    architectureId,
    environment,
  });
  return parseEnvironmentVersion(response.data);
}
