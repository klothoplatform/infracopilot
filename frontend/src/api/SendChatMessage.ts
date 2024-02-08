import type { AxiosResponse } from "axios";
import axios from "axios";
import { parseEnvironmentVersion } from "../shared/architecture/EnvironmentVersion";
import type { ApplyConstraintsResponse } from "./ApplyConstraints";
import { ApplyConstraintsErrorType } from "./ApplyConstraints";
import { EngineError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import type { Constraint } from "../shared/architecture/Constraints";
import { parseConstraints } from "../shared/architecture/Constraints";

export interface SendChatMessageRequest {
  architectureId: string;
  environmentId: string;
  message: string;
  version?: number;
  idToken?: string;
}

export interface SendChatMessageResponse extends ApplyConstraintsResponse {
  constraints: Constraint[];
}

export async function sendChatMessage(
  request: SendChatMessageRequest,
): Promise<SendChatMessageResponse> {
  const {
    architectureId: id,
    environmentId: env_id,
    message,
    idToken,
    version,
  } = request;
  let response: AxiosResponse<any>;

  try {
    response = await axios.post(
      `/api/architecture/${id}/environment/${env_id}/message`,
      {
        message,
        version,
      },
      {
        responseType: "json",
        headers: {
          Authorization: idToken ? `Bearer ${idToken}` : undefined,
          Accept: "application/octet-stream",
        },
      },
    );
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
        constraints: [],
      };
    }
    console.log("error from apply constraints", e);
    const error = new EngineError(
      e.response.data?.title,
      e.response.data?.details ?? "Your request failed.",
    );

    console.log((window as any).CommandBar);
    (async () => {
      (window as any).CommandBar?.trackEvent("send_chat_message_500", {});
      trackError(error);
    })();
    throw error;
  }
  return {
    environmentVersion: parseEnvironmentVersion(response.data),
    constraints: parseConstraints(response.data.constraints),
  };
}
