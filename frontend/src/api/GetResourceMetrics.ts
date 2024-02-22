import axios, { type AxiosResponse } from "axios";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";

export interface GetResourceMetricsRequest {
  architecture: string;
  environmentVersion: string;
  name: string;
  resourceId: string;
  idToken: string;
}

export default async function getResourceMetrics({
  idToken,
  architecture,
  environmentVersion,
  resourceId,
  name,
}: GetResourceMetricsRequest): Promise<any[]> {
  console.log("GetResourceMetrics called");
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/stacks/${architecture}/${environmentVersion}/${name}/resource/${resourceId}/metrics`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(idToken && {
            Authorization: `Bearer ${idToken}`,
          }),
        },
      },
    );
    console.log("called get resource metrics");
  } catch (e: any) {
    const error = new ApiError({
      errorId: "GetResourceMetrics",
      message: "An error occurred while getting resource metrics.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        architectureId: architecture,
        environmentVersionId: environmentVersion,
        name,
        resourceId,
      },
    });
    trackError(error);
    throw error;
  }
  analytics.track("GetResourceMetrics", {
    status: response.status,
    architectureId: architecture,
    environmentVersionId: environmentVersion,
    resourceId,
    name,
  });
  return response.data;
}
