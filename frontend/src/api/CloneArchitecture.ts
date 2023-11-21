import axios from "axios";
import type { Architecture } from "../shared/architecture/Architecture";
import { analytics } from "../App";

export interface CloneArchitectureRequest {
  id: string;
  name: string;
  idToken: string;
}

export default async function cloneArchitecture(
  request: CloneArchitectureRequest,
): Promise<Architecture> {
  console.log("CloneArchitecture called");
  const response = await axios.post(
    `/api/architecture/${request.id}/clone`,
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
    analytics.track("CloneArchitecture", { status: response.status });
    throw new Error("CloneArchitecture failed");
  }
  analytics.track("CloneArchitecture", {
    status: response.status,
    id: response.data.id,
  });

  return {
    name: request.name,
    id: response.data.id,
    version: 0,
  } as Architecture;
}
