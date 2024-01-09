import { analytics } from "../App";
import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import { parseArchitecture, type Architecture } from "../shared/architecture/Architecture";

export async function getArchitecture(
  architectureId: string,
  idToken: string,
): Promise<Architecture> {
  let response: AxiosResponse;
  try {
    response = await axios.get(`/api/architecture/${architectureId}`, {
      responseType: "json",
      decompress: true,
      headers: {
        accept: "application/octet-stream",
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
    });
  } catch (e: any) {
    const error = new ApiError({
      errorId: "GetEnvironmentVersion",
      message: "An error occurred while getting environment version.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id: architectureId,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("GetEnvironmentVersion", { status: response.status, architectureId });
  return parseArchitecture(response.data);
}
