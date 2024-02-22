import { ApplicationError } from "../errors";
import { isObject } from "../object-util";

export enum DeploymentStatus {
  InProgress = "IN_PROGRESS",
  Failed = "FAILED",
  Succeeded = "SUCCEEDED",
}

export enum DeploymentAction {
  Deploy = "DEPLOY",
  Refresh = "REFRESH",
  Destroy = "DESTROY",
}

export interface Deployment {
  id: string;
  architecture_id: string;
  environment_id: string;
  version: number;
  action: string;
  status: DeploymentStatus;
  status_reason: string;
  diff: string;
  initiated_at: number;
  initiated_by: string;
}

export const parseDeployment = (data: any): Deployment => {
  if (!isObject(data)) {
    throw new ApplicationError({
      errorId: "DeploymentParse",
      message: "Deployment data is not an object.",
      data: { data },
    });
  }

  return {
    id: data.id,
    architecture_id: data.architecture_id,
    environment_id: data.environment_id,
    version: data.version,
    action: data.action,
    status: data.status,
    status_reason: data.status_reason,
    diff: data.diff,
    initiated_at: data.initiated_at,
    initiated_by: data.initiated_by,
  };
};

export const parseDeployments = (data: any): Deployment[] => {
  if (!Array.isArray(data)) {
    throw new ApplicationError({
      errorId: "DeploymentsParse",
      message: "Deployments data is not an array.",
      data: { data },
    });
  }

  return data.map(parseDeployment);
};
