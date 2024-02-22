import axios, { type AxiosResponse } from "axios";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";
import { type Stack, parseStack } from "../shared/deployment/stack";

export interface CreateStackRequest {
  name: string;
  architecture: string;
  environmentVersion: string;
  provider: string;
  providerDetails: { [key: string]: any };
  idToken: string;
}

export default async function createStack({
  name,
  architecture,
  environmentVersion,
  provider,
  providerDetails,
  idToken,
}: CreateStackRequest): Promise<Stack> {
  let response: AxiosResponse;
  try {
    console.log("CreateStack called");
    console.log(provider, name);
    response = await axios.post(
      `/api/stacks/${architecture}/${environmentVersion}`,
      {
        name,
        provider,
        provider_details: providerDetails,
      },
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
      errorId: "CreateStack",
      message: "An error occurred while creating a stack.",
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
  analytics.track("CreateStack", {
    status: response.status,
    architectureId: architecture,
    environmentVersionId: environmentVersion,
  });
  return parseStack(response.data);
}
