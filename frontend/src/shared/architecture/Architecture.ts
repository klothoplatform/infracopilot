import type { Edge, Node } from "reactflow";
import { type NodeId } from "./TopologyNode";
import { ApplicationError } from "../errors";
import { isObject } from "../object-util";

export enum ArchitectureView {
  DataFlow = "dataflow",
  IaC = "iac",
}

export enum ViewNodeType {
  Parent = "parent",
  Big = "big",
  Small = "small",
}

export interface ReactFlowElements {
  nodes: Node[];
  edges: Edge[];
}

export interface Architecture {
  provider: string;
  id: string;
  name: string;
  environments: { id: string; default: boolean }[];
  defaultEnvironment: string;
  owner: string;
  created_at?: number;
  created_by?: string;
}

export interface GraphEdge {
  source: NodeId;
  destination: NodeId;
  metadata: object;
}

export const parseArchitecture = (data: any): Architecture => {
  if (!isObject(data)) {
    throw new ApplicationError({
      errorId: "ArchitectureParse",
      message: "Architecture data is not an object.",
      data: { data },
    });
  }

  return {
    provider: data.provider,
    id: data.id,
    name: data.name,
    owner: data.owner,
    environments: data.environments,
    defaultEnvironment: data.environments?.find((env: any) => env.default)?.id,
    created_at: data.created_at,
    created_by: data.created_by,
  };
};
