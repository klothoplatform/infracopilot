import axios from "axios";

export default async function ExportIaC(
  architectureId: string,
  state: number,
  idToken: string,
): Promise<any> {
  const { data, status } = await axios.get(
    `/architecture/${architectureId}/iac`,
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
  if (status !== 200 || !data) {
    throw new Error(`Failed to export IaC`);
  }
  return data;
}
