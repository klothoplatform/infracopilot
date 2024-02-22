import axios, { type AxiosResponse } from "axios";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";
import {
  type Deployment,
  parseDeployments,
} from "../shared/deployment/deployment";

export interface ListStackEventsRequest {
  architecture: string;
  environmentVersion: string;
  name: string;
  idToken: string;
}

export default async function listStackEvents({
  idToken,
  architecture,
  environmentVersion,
  name,
}: ListStackEventsRequest): Promise<Deployment[]> {
  console.log("ListStackEvents called");
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/stacks/${architecture}/${environmentVersion}/${name}/events`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(idToken && {
            Authorization: `Bearer ${idToken}`,
          }),
        },
      },
    );
    console.log("called list stacks");
  } catch (e: any) {
    const error = new ApiError({
      errorId: "ListStackEvents",
      message: "An error occurred while listing stack events.",
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
  analytics.track("ListStackEvents", {
    status: response.status,
    architectureId: architecture,
    environmentVersionId: environmentVersion,
    name,
  });
  return parseDeployments(response.data);
}
