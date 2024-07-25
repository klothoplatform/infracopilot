import type { AxiosResponse } from "axios";
import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import analytics from "../Analytics.ts";

export default async function exportIaC(
  architectureId: string,
  environment: string,
  state: number | null,
  idToken: string,
): Promise<any> {
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/architecture/${architectureId}/environment/${environment}/iac`,
      {
        params: { state },
        responseType: "blob",
        headers: {
          accept: "application/octet-stream",
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
  } catch (e: any) {
    const error = new ApiError({
      errorId: "ExportIaC",
      message: "An error occurred while exporting IaC.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        id: architectureId,
        environment: environment,
        state: state,
        hasData: !!e.response?.data,
      },
    });
    trackError(error);
    throw error;
  }
  analytics.track("ExportIaC", {
    id: architectureId,
    environment: environment,
    state: state,
    status: response.status,
    hasData: !!response.data,
  });

  return response.data;
}
