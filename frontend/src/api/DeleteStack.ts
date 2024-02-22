import axios, { type AxiosResponse } from "axios";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";

export interface DeleteStackRequest {
  architecture: string;
  environmentVersion: string;
  name: string;
  idToken: string;
}

export default async function deleteStack({
  architecture,
  environmentVersion,
  name,
  idToken,
}: DeleteStackRequest): Promise<void> {
  let response: AxiosResponse;
  try {
    response = await axios.delete(
      `/api/stacks/${architecture}/${environmentVersion}/${name}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(idToken && {
            Authorization: `Bearer ${idToken}`,
          }),
        },
      },
    );
  } catch (e: any) {
    const error = new ApiError({
      errorId: "DeleteStack",
      message: "An error occurred while deleting a stack.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        architectureId: architecture,
        environmentVersionId: environmentVersion,
        stackName: name,
      },
    });
    trackError(error);
    throw error;
  }
  analytics.track("DeleteStack", {
    status: response.status,
    architectureId: architecture,
    environmentVersionId: environmentVersion,
    stackName: name,
  });
  return;
}
