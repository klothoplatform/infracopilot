import type { Architecture } from "../shared/architecture/Architecture";
import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

export async function listArchitectures(
  idToken: string,
): Promise<Architecture[]> {
  console.log("listingArchitectures");

  let response: AxiosResponse;
  try {
    response = await axios.get(`/api/architectures`, {
      responseType: "json",
      decompress: true,
      headers: {
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
    });
    console.log(response)
  } catch (e: any) {
    const error = new ApiError({
      errorId: "ListArchitectures",
      message: "An error occurred while retrieving architectures.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
    });
    trackError(error);
    throw error;
  }
  return response.data.architectures ?? [];
}
