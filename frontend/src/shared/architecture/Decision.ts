import type { Constraint } from "./Constraints";
import { NodeId } from "./TopologyNode";

export class Decision {
  constraints: Constraint[];
  resources: string[];

  constructor(constraints: Constraint[], json: any[]) {
    this.constraints = constraints;
    let res: any[] = [];
    if (json) {
      json.forEach((j) => {
        if (!j.Resources) {
          return;
        }
        res = res.concat(j.Resources);
      });
    }
    this.resources = res;
  }

  formatTitle(): string {
    return this.constraints
      .map((c) => c.toIntent())
      .join(", ")
      .replace(/:$/g, "");
  }

  formatInfo(): string {
    const resourcesMap = this.resources.map((res) => {
      const id = NodeId.parse(res);
      const resType = id.type
        .split("_")
        .map(
          ([firstChar, ...rest]) =>
            firstChar.toUpperCase() + rest.join("").toLowerCase(),
        )
        .join(" ");
      return "• Created " + resType + " " + id.name;
    });

    const infostr = resourcesMap.slice(0, 4).join("\n");
    if (resourcesMap.length > 4) {
      return infostr + "\n• and " + (resourcesMap.length - 4) + " more";
    }
    return infostr;
  }
}
