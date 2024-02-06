import axios, { type AxiosResponse } from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import {
  type TopologyDiff,
  parseTopologyDiff,
} from "../shared/architecture/TopologyDiff";

export interface DiffEnvironmentsRequest {
  architectureId: string;
  targetEnvironmentId: string;
  idToken?: string;
}

export async function diffEnvironments({
  architectureId,
  targetEnvironmentId,
  idToken,
}: DiffEnvironmentsRequest): Promise<TopologyDiff> {
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/architecture/${architectureId}/environment/${targetEnvironmentId}/diff`,
      {
        responseType: "json",
        decompress: true,
        headers: {
          accept: "application/octet-stream",
          ...(idToken && {
            Authorization: `Bearer ${idToken}`,
          }),
        },
      },
    );
  } catch (e: any) {
    const error = new ApiError({
      errorId: "DiffEnvironments",
      message: "An error occurred during environment diff.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id: architectureId,
        targetEnvironmentId,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("DiffEnvironments", {
    status: response.status,
    architectureId,
    targetEnvironmentId,
  });
  return parseTopologyDiff(response.data);
}
