import axios, { type AxiosResponse } from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

import analytics from "../Analytics.ts";

export interface ExplainArchitectureRequest {
  architectureId: string;
  environmentId: string;
  idToken?: string;
}

export async function explainArchitecture(
  request: ExplainArchitectureRequest,
): Promise<string> {
  let response: AxiosResponse;
  const { architectureId, environmentId, idToken } = request;
  try {
    response = await axios.get(
      `/api/architecture/${architectureId}/environment/${environmentId}/explain`,
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
      errorId: "ExplainArchitecture",
      message: "An error occurred during explaining architecture.",
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

  analytics.track("ExplainArchitecture", {
    status: response.status,
    architectureId,
    environmentId,
  });
  return response.data;
}
