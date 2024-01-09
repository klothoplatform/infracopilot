import type { AxiosResponse } from "axios";
import axios from "axios";
import type { Architecture } from "../shared/architecture/Architecture";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

export interface CloneArchitectureRequest {
  id: string;
  name: string;
  idToken: string;
}

export default async function cloneArchitecture(
  request: CloneArchitectureRequest,
): Promise<Architecture> {
  let response: AxiosResponse;
  try {
    response = await axios.post(
      `/api/architecture/${request.id}/clone`,
      {
        name: request.name,
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
      errorId: "CloneArchitecture",
      message: "An error occurred while cloning architecture.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id: request.id,
        name: request.name,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("CloneArchitecture", {
    status: response.status,
    id: response.data.id,
  });

  return {
    name: request.name,
    id: response.data.id,
  } as Architecture;
}
