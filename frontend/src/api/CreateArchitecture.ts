import type { AxiosResponse } from "axios";
import axios from "axios";
import type { Architecture } from "../shared/architecture/Architecture";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

export interface CreateArchitectureRequest {
  name: string;
  owner: string;
  engineVersion: number;
  idToken: string;
}

export default async function createArchitecture(
  request: CreateArchitectureRequest,
): Promise<Architecture> {
  let response: AxiosResponse;
  try {
    response = await axios.post(
      `/api/architecture`,
      {
        name: request.name,
        owner: request.owner,
        engine_version: request.engineVersion,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(request.idToken && {
            Authorization: `Bearer ${request.idToken}`,
          }),
        },
      },
    );
  } catch (e: any) {
    const error = new ApiError({
      errorId: "CreateArchitecture",
      message: "An error occurred while creating architecture.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        name: request.name,
        owner: request.owner,
        engineVersion: request.engineVersion,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("CreateArchitecture", {
    status: response.status,
    id: response.data.id,
  });

  return {
    name: request.name,
    owner: request.owner,
    id: response.data.id,
  } as Architecture;
}
