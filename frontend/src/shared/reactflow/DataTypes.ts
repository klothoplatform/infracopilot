import { NodeId } from "../architecture/TopologyNode";

export interface NodeData {
  label: string;
  resourceId: NodeId;
  isNew: boolean;
}

export interface EdgeData {
  label: string;
  isNew: boolean;
}
