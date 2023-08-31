import axios from "axios";
import type { Architecture } from "../shared/architecture/Architecture";

export interface CreateArchitectureRequest {
  name: string;
  owner: string;
  engineVersion: number;
}

export default async function createArchitecture(
  request: CreateArchitectureRequest,
): Promise<Architecture> {
  console.log("CreateArchitecture called");
  const response = await axios.post(
    `/architecture`,
    {
      name: request.name,
      owner: request.owner,
      engine_version: request.engineVersion,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (response.status !== 200) {
    throw new Error("CreateArchitecture failed");
  }
  return {
    ...request,
    id: response.data.id,
    version: 0,
  } as Architecture;
}
