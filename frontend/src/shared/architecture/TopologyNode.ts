const UNKNOWN_PROVIDER = "UNKNOWN";

export interface TopologyNodeData {
  parent?: NodeId;
  isNew?: boolean;
}

export class TopologyNode {
  constructor(
    public resourceId: NodeId,
    public vizMetadata: Partial<TopologyNodeData> = {}
  ) {}

  public get id(): string {
    return this.resourceId.toTopologyString();
  }
}

export class NodeId {
  constructor(
    public type: string,
    public namespace: string,
    public name: string,
    public provider: string = UNKNOWN_PROVIDER
  ) {}

  public toTopologyString(): string {
    return `${this.provider}:${this.type}${
      this.namespace || this.name.includes(":") ? ":" + this.namespace : ""
    }/${this.name}`;
  }

  public toKlothoIdString(): string {
    return `${this.provider}:${this.type}${
      this.namespace || this.name.includes(":") ? ":" + this.namespace : ""
    }:${this.name}`;
  }

  public static fromString(input: string, defaultProvider?: string): NodeId {
    const nodeParts = input.split("/");
    let nodeType = nodeParts[0].trim();
    let provider: string | undefined = undefined;
    let namespace = "";
    if (nodeType.includes(":")) {
      [provider, nodeType, namespace] = nodeType
        .split(":")
        .map((s) => s.trim());
    }
    const nodeId = nodeParts
      .slice(1)
      .map((s) => s.trim())
      .join("/");
    return new NodeId(
      nodeType,
      namespace ?? "",
      nodeId,
      provider ?? defaultProvider ?? UNKNOWN_PROVIDER
    );
  }
}
