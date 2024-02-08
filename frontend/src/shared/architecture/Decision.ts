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

  formatTitle(mention?: boolean): string {
    return this.constraints
      .map((c) => c.toIntent(mention))
      .join("\n")
      .replace(/:$/g, "");
  }

  formatInfo(mention?: boolean): string {
    const resourceMap = this.resources.map((res) => {
      const id = NodeId.parse(res);
      const resType = id.type
        .split("_")
        .map(
          ([firstChar, ...rest]) =>
            firstChar.toUpperCase() + rest.join("").toLowerCase(),
        )
        .join(" ");
      const slug = mention ? id.toMention() : `${resType} ${id.name}`;
      return "• Created " + slug;
    });

    const infostr = resourceMap.slice(0, 4).join("\n");
    if (resourceMap.length > 4) {
      return infostr + "\n• and " + (resourceMap.length - 4) + " more";
    }
    return infostr;
  }
}
