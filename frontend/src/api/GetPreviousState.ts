import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import {
  type EnvironmentVersion,
  parseEnvironmentVersion,
} from "../shared/architecture/EnvironmentVersion";
import analytics from "../Analytics.ts";

export async function getPrevState(
  architectureId: string,
  environment: string,
  idToken: string,
  version: number,
): Promise<EnvironmentVersion | undefined> {
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/architecture/${architectureId}/environment/${environment}/prev`,
      {
        params: { version: version },
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
        architectureId,
        environment,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("GetPreviousState", {
    status: response.status,
    architectureId,
    environment,
    version,
  });
  return parseEnvironmentVersion(response.data);
}
