import { isObject } from "../object-util";
import { ApplicationError } from "../errors";

export interface Stack {
  name: string;
  architecture_id: string;
  environment_id: string;
  latest_deployment_id?: string;
  provider: string;
  provider_details?: { [key: string]: any };
  status?: string;
  status_reason?: string;
  created_at?: number;
  created_by?: string;
}

export const parseStack = (data: any): Stack => {
  if (!isObject(data)) {
    throw new ApplicationError({
      errorId: "StackParse",
      message: "Stack data is not an object.",
      data: { data },
    });
  }

  return {
    name: data.name,
    architecture_id: data.architecture_id,
    environment_id: data.environment_id,
    latest_deployment_id: data.latest_deployment_id,
    provider: data.provider,
    provider_details: data.provider_details,
    status: data.status,
    status_reason: data.status_reason,
    created_at: data.created_at,
    created_by: data.created_by,
  };
};

export const parseStacks = (data: any): Stack[] => {
  if (!Array.isArray(data)) {
    throw new ApplicationError({
      errorId: "StacksParse",
      message: "Stacks data is not an array.",
      data: { data },
    });
  }

  return data.map(parseStack);
};
