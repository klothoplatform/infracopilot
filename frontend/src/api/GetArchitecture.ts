import type { Architecture } from "../shared/architecture/Architecture";
import { ArchitectureView } from "../shared/architecture/Architecture";
import axios from "axios";
import type { TopologyGraph } from "../shared/architecture/TopologyGraph";
import { parse } from "../shared/architecture/TopologyGraph";
import yaml from "yaml";

export async function getArchitecture(
  id: string,
  version?: number,
): Promise<Architecture> {
  const { data } = await axios.get(`/architecture/${id}`, {
    responseType: "arraybuffer",
    decompress: true,
    headers: {
      accept: "application/octet-stream",
    },
  });

  const architectureJSON = JSON.parse(new TextDecoder().decode(data));
  architectureJSON.views = new Map<ArchitectureView, TopologyGraph>();
  if (architectureJSON.state?.topology_yaml) {
    architectureJSON.views.set(
      ArchitectureView.DataFlow,
      parse((architectureJSON.state?.topology_yaml as string) ?? "")
        .values()
        .next().value,
    );
  }
  architectureJSON.resourceMetadata = architectureJSON.state?.resources_yaml
    ? yaml.parse(architectureJSON.state.resources_yaml).resourceMetadata
    : {};
  console.log("architectureJSON: ", architectureJSON);

  return architectureJSON as Architecture;
}
