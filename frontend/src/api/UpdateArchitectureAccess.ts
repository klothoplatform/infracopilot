import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import type { ArchitectureRole } from "../shared/architecture/Access";

export interface UpdateArchitectureAccessRequest {
  architectureId: string;
  entityRoles: {
    [key: string]: ArchitectureRole | null;
  };
}

export async function updateArchitectureAccess(
  request: UpdateArchitectureAccessRequest,
  token: string,
): Promise<void> {
  let response: AxiosResponse;
  try {
    response = await axios.put(
      `/api/architecture/${request.architectureId}/access`,
      { entity_roles: request.entityRoles },
      {
        responseType: "json",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch (e: any) {
    const error = new ApiError({
      errorId: "UpdateArchitectureAccess",
      message: "An error occurred while updating architecture access details.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id: request.architectureId,
      },
    });
    trackError(error);
    throw error;
  }

  analytics.track("UpdateArchitectureAccess", {
    status: response.status,
    architectureId: request.architectureId,
  });
}
