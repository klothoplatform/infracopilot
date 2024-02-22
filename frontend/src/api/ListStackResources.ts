import axios, { type AxiosResponse } from "axios";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";

export interface ListStackResourcesRequest {
  architecture: string;
  environmentVersion: string;
  name: string;
  idToken: string;
}

export default async function listStackResources({
  idToken,
  architecture,
  environmentVersion,
  name,
}: ListStackResourcesRequest): Promise<any> {
  console.log("ListStackResources called");
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/stacks/${architecture}/${environmentVersion}/${name}/resources`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(idToken && {
            Authorization: `Bearer ${idToken}`,
          }),
        },
      },
    );
    console.log("called list stack resources");
  } catch (e: any) {
    const error = new ApiError({
      errorId: "ListStackEvents",
      message: "An error occurred while listing stack resources.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        architectureId: architecture,
        environmentVersionId: environmentVersion,
        name,
      },
    });
    trackError(error);
    throw error;
  }
  analytics.track("ListStackResources", {
    status: response.status,
    architectureId: architecture,
    environmentVersionId: environmentVersion,
    name,
  });
  console.log(response.data);
  return response.data;
}
