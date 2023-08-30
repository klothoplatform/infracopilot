import type { TopologyNodeData } from "./TopologyNode";

export interface SubnetData extends TopologyNodeData {
  public?: boolean;
  cidr_block?: string;
}

export interface RdsInstanceData extends TopologyNodeData {
  engine?: string;
}
