import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import type { ArchitectureAccess } from "../shared/architecture/Access";
import { parseEntities } from "../shared/architecture/Access";
import analytics from "../Analytics.ts";

export interface GetArchitectureAccessRequest {
  architectureId: string;
  summarized?: boolean;
}

export async function getArchitectureAccess(
  { architectureId, summarized }: GetArchitectureAccessRequest,
  idToken: string,
): Promise<ArchitectureAccess> {
  let response: AxiosResponse;
  try {
    response = await axios.get(`/api/architecture/${architectureId}/access`, {
      params: {
        summarized,
      },
      responseType: "json",
      headers: {
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
    });
  } catch (e: any) {
    const error = new ApiError({
      errorId: "GetArchitectureAccess",
      message: "An error occurred while getting architecture access details.",
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

  analytics.track("GetArchitectureAccess", {
    status: response.status,
    architectureId,
  });
  return parseEntities(response.data);
}
