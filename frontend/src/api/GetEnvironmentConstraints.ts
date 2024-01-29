import { analytics } from "../App";
import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import {
  type Constraint,
  parseConstraints,
} from "../shared/architecture/Constraints";

export async function getEnvironmentConstraints(
  architectureId: string,
  environmentId: string,
  idToken: string,
): Promise<Constraint[]> {
  let response: AxiosResponse;
  try {
    response = await axios.get(`/api/architecture/${architectureId}/environment/${environmentId}/constraints`, {
      responseType: "json",
      decompress: true,
      headers: {
        accept: "application/octet-stream",
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
    });
  } catch (e: any) {
    const error = new ApiError({
      errorId: "GetEnvironmentConstraints",
      message: "An error occurred while getting environment version.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id: architectureId,
        environmentId,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("GetEnvironmentConstraints", {
    status: response.status,
    architectureId,
    environmentId,
  });
  return parseConstraints(response.data);
}
