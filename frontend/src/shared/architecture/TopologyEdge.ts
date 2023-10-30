import type { NodeId } from "./TopologyNode";

export interface TopologyEdgeData {
  path?: NodeId[];
}

class TopologyEdge {
  constructor(
    public sourceId: NodeId,
    public targetId: NodeId,
    public vizMetadata?: TopologyEdgeData,
  ) {}

  public get source(): string {
    return this.sourceId.toString();
  }

  public get id(): string {
    return `${this.source}-${this.target}`;
  }

  public get target(): string {
    return this.targetId.toString();
  }
}

export default TopologyEdge;
