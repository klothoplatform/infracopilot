import axios, { type AxiosResponse } from "axios";
import { type Architecture } from "../shared/architecture/Architecture";
import { type EnvironmentVersion } from "../shared/architecture/EnvironmentVersion";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";
import { ApiError } from "../shared/errors";

export interface DeployArchitectureRequest {
  architecture: Architecture;
  environmentVersion: EnvironmentVersion;
  name: string;
  idToken: string;
  state: {
    region: string;
    access_key: string;
    secret_key: string;
    pulumi_access_token: string;
  };
}

export default async function deployArchitecture({
  idToken,
  architecture,
  environmentVersion,
  name,
  state,
}: DeployArchitectureRequest): Promise<void> {
  console.log("DeployArchitecture called");
  let response: AxiosResponse;
  try {
    response = await axios.post(
      `/api/deploy/${architecture.id}/${environmentVersion.id}/${name}`,
      {
        region: state.region,
        access_key: state.access_key,
        secret_key: state.secret_key,
        pulumi_access_token: state.pulumi_access_token,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(idToken && {
            Authorization: `Bearer ${idToken}`,
          }),
        },
      },
    );
    console.log("called deploy");
  } catch (e: any) {
    const error = new ApiError({
      errorId: "DeployArchitecture",
      message: "An error occurred while deploying architecture.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        architectureId: architecture.id,
        environmentVersionId: environmentVersion.id,
        name,
      },
    });
    trackError(error);
    throw error;
  }
  analytics.track("DeployArchitecture", {
    status: response.status,
    architectureId: architecture.id,
    environmentVersionId: environmentVersion.id,
    name,
  });
}
