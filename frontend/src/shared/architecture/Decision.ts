import type {Constraint} from "./Constraints";
import { NodeId } from "./TopologyNode";

export class Decision {
    constraints: Constraint[]
    resources: string[]

    constructor(constraints: Constraint[], json: any[]) {
        this.constraints = constraints
        console.log("json: ", json)
        let res: any[] = []
        if (json != undefined) {
            json.forEach(j => {
                console.log("j: ", j)
                console.log("j.resources: ", j.Resources)
                if (j.Resources == undefined) {
                    return
                }
                res = res.concat(j.Resources)
            })
        }
        this.resources = res
    }

    formatTitle(): string {
        return this.constraints.map(c => c.toIntent()).join(", ")
    }

    formatInfo(): string {
        console.log(this.resources)
        const resourcesMap = this.resources.map(res => {
            const id = NodeId.fromId(res)
            const resType = id.type
                .split("_")
                .map(
                    ([firstChar, ...rest]) =>
                    firstChar.toUpperCase() + rest.join("").toLowerCase(),
                )
                .join(" ")
            return "• Created " + resType + " " + id.name
        })
        
        const infostr = resourcesMap.slice(0,4).join("\n")
        if (resourcesMap.length > 4) {
            return infostr + "\n• and " + (resourcesMap.length - 4) + " more"
        }
        return infostr
    }
}