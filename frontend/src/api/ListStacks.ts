import axios, { type AxiosResponse } from "axios";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";
import { type Stack, parseStacks } from "../shared/deployment/stack";

export interface ListStacksRequest {
  architecture: string;
  environmentVersion: string;
  idToken: string;
}

export default async function listStacks({
  idToken,
  architecture,
  environmentVersion,
}: ListStacksRequest): Promise<Stack[]> {
  console.log("ListStacks called");
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/stacks/${architecture}/${environmentVersion}`,
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
      errorId: "ListStacks",
      message: "An error occurred while listing stacks.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        architectureId: architecture,
        environmentVersionId: environmentVersion,
      },
    });
    trackError(error);
    throw error;
  }
  analytics.track("ListStacks", {
    status: response.status,
    architectureId: architecture,
    environmentVersionId: environmentVersion,
  });
  return parseStacks(response.data);
}
