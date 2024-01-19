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

export interface ConfigurationError {
  resource: NodeId;
  property: string;
  value?: any;
  error: string;
}

export interface Architecture {
  provider: string;
  id: string;
  name: string;
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

  const architecture: Architecture = {
    provider: data.provider,
    id: data.id,
    name: data.name,
    owner: data.owner,
    created_at: data.created_at,
    created_by: data.created_by,
  };

  return architecture;
};
