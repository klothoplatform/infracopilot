import axios from "axios";

export default async function ExportIaC(
  architectureId: string,
  state: number,
): Promise<any> {
  const { data, status } = await axios.get(
    `/architecture/${architectureId}/iac`,
    {
      params: {
        state: `${state}`,
      },
      responseType: "blob", // Important
      headers: {
        "Content-Type": "application/binary",
      },
    },
  );
  if (status !== 200 || !data) {
    throw new Error(`Failed to export IaC`);
  }
  return data;
}
