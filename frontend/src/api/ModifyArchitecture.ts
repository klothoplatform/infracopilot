import axios from "axios";
import {
  type Architecture,
  parseArchitecture,
} from "../shared/architecture/Architecture";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import analytics from "../Analytics.ts";

export interface ModifyArchitectureRequest {
  id: string;
  name: string;
  idToken: string;
}

export default async function modifyArchitecture(
  request: ModifyArchitectureRequest,
): Promise<Architecture> {
  console.log("ModifyArchitecture called");
  const response = await axios.post(
    `/api/architecture/${request.id}`,
    {
      name: request.name,
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...(request.idToken && { Authorization: `Bearer ${request.idToken}` }),
      },
    },
  );
  if (response.status !== 200) {
    const error = new ApiError({
      errorId: "ModifyArchitecture",
      message: "An error occurred while modifying architecture.",
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
    });
    trackError(error);
    throw error;
  }
  analytics.track("ModifyArchitecture", {
    status: response.status,
    id: request.id,
  });

  return parseArchitecture(response.data);
}
