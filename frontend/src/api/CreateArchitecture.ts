import axios from "axios";
import type { Architecture } from "../shared/architecture/Architecture";

export interface CreateArchitectureRequest {
  name: string;
  owner: string;
  engineVersion: number;
  idToken: string;
}

export default async function createArchitecture(
  request: CreateArchitectureRequest,
): Promise<Architecture> {
  console.log("CreateArchitecture called");
  const response = await axios.post(
    `/api/architecture`,
    {
      name: request.name,
      owner: request.owner,
      engine_version: request.engineVersion,
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...(request.idToken && { Authorization: `Bearer ${request.idToken}` }),
      },
    },
  );
  if (response.status !== 200) {
    throw new Error("CreateArchitecture failed");
  }

  return {
    name: request.name,
    owner: request.owner,
    engineVersion: request.engineVersion,
    id: response.data.id,
    version: 0,
  } as Architecture;
}
