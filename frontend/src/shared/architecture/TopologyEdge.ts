import type { NodeId } from "./TopologyNode";

class TopologyEdge {
  constructor(
    public sourceId: NodeId,
    public targetId: NodeId,
    public vizMetadata?: object,
  ) {}

  public get source(): string {
    return this.sourceId.toTopologyString();
  }

  public get id(): string {
    return `${this.source}-${this.target}`;
  }

  public get target(): string {
    return this.targetId.toTopologyString();
  }
}

export default TopologyEdge;
