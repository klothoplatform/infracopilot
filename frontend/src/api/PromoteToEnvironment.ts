// invoke /api/architecture/{id}/environment/{env_id}/promote

import type { EnvironmentVersion } from "../shared/architecture/EnvironmentVersion";
import { parseEnvironmentVersion } from "../shared/architecture/EnvironmentVersion";
import axios, { type AxiosResponse } from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

import analytics from "../Analytics.ts";

export interface PromoteToEnvironmentRequest {
  architectureId: string;
  targetEnvironmentId: string;
  idToken?: string;
}

export async function promoteToEnvironment({
  architectureId,
  targetEnvironmentId,
  idToken,
}: PromoteToEnvironmentRequest): Promise<EnvironmentVersion> {
  let response: AxiosResponse;
  try {
    response = await axios.post(
      `/api/architecture/${architectureId}/environment/${targetEnvironmentId}/promote`,
      undefined,
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
      errorId: "PromoteToEnvironment",
      message: "An error occurred during environment promotion.",
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

  analytics.track("PromoteToEnvironment", {
    status: response.status,
    architectureId,
    targetEnvironmentId,
  });
  return parseEnvironmentVersion(response.data);
}
