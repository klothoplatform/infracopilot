import { NodeId } from "./Node";

class Edge {
  constructor(
    public sourceId: NodeId,
    public targetId: NodeId,
    public data?: object
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

export default Edge;
