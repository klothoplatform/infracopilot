import type { Constraint } from "../shared/architecture/Constraints";
import { formatConstraints } from "../shared/architecture/Constraints";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import {
  type EnvironmentVersion,
  parseEnvironmentVersion,
} from "../shared/architecture/EnvironmentVersion";

export enum ApplyConstraintsErrorType {
  ConfigValidation = "ConfigValidation",
}

export interface ApplyConstraintsResponse {
  environmentVersion: EnvironmentVersion;
  errorType?: ApplyConstraintsErrorType;
}

export async function applyConstraints(
  architectureId: string,
  environment: string,
  latestState: number,
  constraints: Constraint[],
  idToken: string,
  overwrite?: boolean,
): Promise<ApplyConstraintsResponse> {
  console.log("applyConstraints", architectureId);

  const constraintCount: Record<string, number> = {};
  for (const c of constraints) {
    const key = `${c.scope}:${c.operator}`;
    constraintCount[key] = (constraintCount[key] ?? 0) + 1;
  }

  let data;
  try {
    const response = await axios.post(
      `/api/architecture/${architectureId}/environment/${environment}/run`,
      {
        constraints: JSON.parse(formatConstraints(constraints)),
        overwrite: overwrite ?? false,
      },
      {
        params: {
          state: latestState,
        },
        responseType: "json",
        decompress: true,
        headers: {
          accept: "application/octet-stream",
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
    data = response.data;
    console.log("response from apply constraints", data);
  } catch (e: any) {
    console.log("error from apply constraints", e);
    if (
      e.response.status === 400 &&
      e.response.data?.error_type === "ConfigValidation"
    ) {
      console.log(e.response.data.config_errors);
      return {
        environmentVersion: parseEnvironmentVersion(e.response.data),
        errorType: ApplyConstraintsErrorType.ConfigValidation,
      };
    }
    const error = new ApiError({
      errorId: "ApplyConstraints",
      message: "An error occurred while applying constraints.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
    });

    console.log((window as any).CommandBar);
    (async () => {
      (window as any).CommandBar?.trackEvent("apply_constraints_500", {});
      trackError(error);
    })();
    throw error;
  }
  return {
    environmentVersion: parseEnvironmentVersion(data),
  };
}
