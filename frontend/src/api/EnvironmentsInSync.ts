// invoke /api/architecture/{id}/environment/{env_id}/promote

import {
  parseEnvironmentsInSync,
  type EnvironmentsInSync,
} from "../shared/architecture/EnvironmentVersion";
import axios, { type AxiosResponse } from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

import analytics from "../Analytics.ts";

export interface EnvironmentsInSyncRequest {
  architectureId: string;
  targetEnvironmentId: string;
  idToken?: string;
}

export async function environmentsInSync({
  architectureId,
  targetEnvironmentId,
  idToken,
}: EnvironmentsInSyncRequest): Promise<EnvironmentsInSync> {
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/architecture/${architectureId}/environment/${targetEnvironmentId}/insync`,
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
      errorId: "EnvironmentsInSync",
      message: "An error occurred during environment in sync.",
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

  analytics.track("EnvironmentsInSync", {
    status: response.status,
    architectureId,
    targetEnvironmentId,
  });
  return parseEnvironmentsInSync(response.data);
}
