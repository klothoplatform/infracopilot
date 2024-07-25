import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import analytics from "../Analytics.ts";

export interface DeleteArchitectureRequest {
  id: string;
  idToken: string;
}

export default async function deleteArchitecture({
  idToken,
  id,
}: DeleteArchitectureRequest): Promise<boolean> {
  console.log("DeleteArchitecture called");
  let response: AxiosResponse;
  try {
    response = await axios.delete(`/api/architecture/${id}`, {
      headers: {
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
    });
  } catch (e: any) {
    const error = new ApiError({
      errorId: "DeleteArchitecture",
      message: "An error occurred while deleting architecture.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id,
      },
    });
    trackError(error);
    throw error;
  }
  analytics.track("DeleteArchitecture", {
    status: response.status,
    id,
  });

  return true;
}
