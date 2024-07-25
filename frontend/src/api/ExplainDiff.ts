import axios, { type AxiosResponse } from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import { type TopologyDiff } from "../shared/architecture/TopologyDiff";
import analytics from "../Analytics.ts";

export interface ExplainDiffRequest {
  architectureId: string;
  environmentId: string;
  diff: TopologyDiff;
  version: number;
  idToken?: string;
}

export async function explainDiff(
  request: ExplainDiffRequest,
): Promise<string> {
  let response: AxiosResponse;
  const { architectureId, environmentId, diff, idToken, version } = request;
  try {
    response = await axios.post(
      `/api/architecture/${architectureId}/environment/${environmentId}/explain`,
      {
        message: JSON.stringify(diff),
        version,
      },
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
      errorId: "ExplainDiff",
      message: "An error occurred during explaining diff.",
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

  analytics.track("ExplainDiff", {
    status: response.status,
    architectureId,
    environmentId,
  });
  return response.data;
}
