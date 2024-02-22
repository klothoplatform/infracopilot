import axios, { type AxiosResponse } from "axios";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";

export interface GetResourceLogsRequest {
  architecture: string;
  environmentVersion: string;
  name: string;
  resourceId: string;
  idToken: string;
}

export default async function getResourceLogs({
  idToken,
  architecture,
  environmentVersion,
  resourceId,
  name,
}: GetResourceLogsRequest): Promise<string[]> {
  console.log("GetResourceLogs called");
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/stacks/${architecture}/${environmentVersion}/${name}/resource/${resourceId}/logs`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(idToken && {
            Authorization: `Bearer ${idToken}`,
          }),
        },
      },
    );
    console.log("called get resource logs");
  } catch (e: any) {
    const error = new ApiError({
      errorId: "GetResourceLogs",
      message: "An error occurred while getting resource logs.",
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
  analytics.track("GetResourceLogs", {
    status: response.status,
    architectureId: architecture,
    environmentVersionId: environmentVersion,
    resourceId,
    name,
  });
  return response.data;
}
