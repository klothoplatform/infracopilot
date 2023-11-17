import axios from "axios";
import type { Architecture } from "../shared/architecture/Architecture";
import { analytics } from "../App";

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
    analytics.track("ModifyArchitecture", { status: response.status });
    throw new Error("ModifyArchitecture failed");
  }
  analytics.track("ModifyArchitecture", {
    status: response.status,
    id: request.id,
  });

  return {
    name: request.name,
    id: request.id,
    version: 0,
  } as Architecture;
}
