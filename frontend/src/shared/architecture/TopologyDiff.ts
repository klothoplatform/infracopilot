import { NodeId } from "./TopologyNode";
import { isObject } from "../object-util";
import { ApplicationError } from "../errors";

export enum DiffStatus {
  ADDED = "added",
  REMOVED = "removed",
  CHANGED = "changed",
}

export class Diff {
  constructor(
    public status: DiffStatus,
    public properties: { [key: string]: any } = {},
    public target?: NodeId,
  ) {}
}

export class TopologyDiff {
  constructor(
    public resources: { [key: string]: Diff } = {},
    public edges: { [key: string]: Diff } = {},
  ) {}
}

export function parseTopologyDiff(rawDiff: any): TopologyDiff {
  interface Value {
    status: DiffStatus;
    properties: any; // Replace 'any' with the actual type if known
    target: string;
  }

  if (!isObject(rawDiff)) {
    throw new ApplicationError({
      errorId: "parseTopologyDiff",
      message: "TopologyDiff state is invalid.",
      data: {
        rawDiff,
      },
    });
  }
  const resources: { [key: string]: Diff } = {};
  const edges: { [key: string]: Diff } = {};
  console.log(rawDiff);
  console.log(rawDiff.resources, "in parseTopologyDiff");
  console.log(rawDiff.edges, "in parseTopologyDiff");
  console.log(Object.entries(rawDiff.resources), "in parseTopologyDiff");
  for (const [key, value] of Object.entries(rawDiff.resources)) {
    console.log(key, value, "in resources loop");
    const typedValue = value as Value;
    console.log(typedValue);
    resources[key] = new Diff(
      typedValue.status,
      typedValue.properties,
      typedValue.target ? NodeId.fromTopologyId(typedValue.target) : undefined,
    );
  }
  for (const [key, value] of Object.entries(rawDiff.edges)) {
    console.log(key, value, "in edges loop");
    const typedValue = value as Value;
    edges[key] = new Diff(
      typedValue.status,
      typedValue.properties,
      typedValue.target ? NodeId.fromTopologyId(typedValue.target) : undefined,
    );
  }
  return new TopologyDiff(resources, edges);
}
