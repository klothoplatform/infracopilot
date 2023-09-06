import type { Constraint } from "../shared/architecture/Constraints";
import { formatConstraints } from "../shared/architecture/Constraints";
import type { Architecture } from "../shared/architecture/Architecture";
import { ArchitectureView } from "../shared/architecture/Architecture";
import axios from "axios";
import type { TopologyGraph } from "../shared/architecture/TopologyGraph";
import { parse } from "../shared/architecture/TopologyGraph";
import yaml from "yaml";

export async function applyConstraints(
  architectureId: string,
  latestState: number,
  constraints: Constraint[],
): Promise<Architecture> {
  console.log("applyConstraints", architectureId);

  try {
    const { data } = await axios.post(
      `/architecture/${architectureId}/run`,
      { constraints: JSON.parse(formatConstraints(constraints)) },
      {
        params: {
          state: latestState,
        },
        responseType: "arraybuffer",
        decompress: true,
        headers: {
          accept: "application/octet-stream",
        },
      },
    );
    const architectureJSON = JSON.parse(new TextDecoder().decode(data));
    architectureJSON.views = new Map<ArchitectureView, TopologyGraph>([
      [
        ArchitectureView.DataFlow,
        parse(architectureJSON.state.topology_yaml as string)
          .values()
          .next().value,
      ],
    ]);
    architectureJSON.resourceMetadata = architectureJSON.state.resources_yaml
      ? yaml.parse(architectureJSON.state.resources_yaml).resourceMetadata
      : {};
    console.log("architectureJSON: ", architectureJSON);
  
    return architectureJSON as Architecture;
  } catch (error) {
    console.log("error: ", error);
    return {} as Architecture;
  }
}
