import axios from "axios";
import type { Architecture } from "../shared/architecture/Architecture";
import { analytics } from "../App";

export interface DeleteArchitectureRequest {
  id: string;
  idToken: string;
}

export default async function deleteArchitecture(
  request: DeleteArchitectureRequest,
): Promise<boolean> {
  console.log("DeleteArchitecture called");
  const response = await axios.delete(`/api/architecture/${request.id}`, {
    headers: {
      "Content-Type": "application/json",
      ...(request.idToken && { Authorization: `Bearer ${request.idToken}` }),
    },
  });
  if (response.status !== 200) {
    analytics.track("DeleteArchitecture", { status: response.status });
    throw new Error("DeleteArchitecture failed");
  }
  analytics.track("DeleteArchitecture", {
    status: response.status,
    id: request.id,
  });

  return true;
}
