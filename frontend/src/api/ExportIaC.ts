import axios from "axios";
import { analytics } from "../App";

export default async function ExportIaC(
  architectureId: string,
  state: number,
  idToken: string,
): Promise<any> {
  const { data, status } = await axios.get(
    `/api/architecture/${architectureId}/iac`,
    {
      params: {
        state: `${state}`,
      },
      responseType: "blob",
      headers: {
        accept: "application/octet-stream",
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
    },
  );
  analytics.track("ExportIaC", {
    id: architectureId,
    state: state,
    status: status,
    hasData: !!data,
  });
  if (status !== 200 || !data) {
    throw new Error(`Failed to export IaC`);
  }
  return data;
}
