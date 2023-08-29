import { Architecture } from "../shared/architecture/Architecture";
import axios from "axios";
import pako from "pako";

export async function getArchitecture(
  id: string,
  version?: number
): Promise<Architecture> {
  console.log(
    "getArchitecture called with id: " + id + " and version: " + version
  );
  const { data } = await axios.get(`/architecture/${id}`, {
    responseType: "arraybuffer",
    decompress: true,
  });

  const architectureJSON = JSON.parse(new TextDecoder().decode(data));
  console.log("architectureJSON: ", architectureJSON);
  return architectureJSON as Architecture;
}
