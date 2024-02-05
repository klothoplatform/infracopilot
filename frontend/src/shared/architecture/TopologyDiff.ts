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
  for (const [key, value] of Object.entries(rawDiff.resources)) {
    const typedValue = value as Value;
    resources[key] = new Diff(
      typedValue.status,
      typedValue.properties,
      typedValue.target ? NodeId.fromTopologyId(typedValue.target) : undefined,
    );
  }
  for (const [key, value] of Object.entries(rawDiff.edges)) {
    const typedValue = value as Value;
    edges[key] = new Diff(
      typedValue.status,
      typedValue.properties,
      typedValue.target ? NodeId.fromTopologyId(typedValue.target) : undefined,
    );
  }
  return new TopologyDiff(resources, edges);
}
