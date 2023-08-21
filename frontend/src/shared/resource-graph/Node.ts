const UNKNOWN_PROVIDER = "UNKNOWN";

export interface NodeData {
  parent?: NodeId;
}

export class Node {
  constructor(
    public resourceId: NodeId,
    public data: Partial<NodeData> = {},
  ) {}

  public get id(): string {
    return this.resourceId.toString();
  }
}

export class NodeId {
  constructor(
    public type: string,
    public namespace: string,
    public name: string,
    public provider: string = UNKNOWN_PROVIDER,
  ) {}

  public toString(): string {
    return `${this.provider}:${this.type}:${this.namespace}/${this.name}`;
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
      provider ?? defaultProvider ?? UNKNOWN_PROVIDER,
    );
  }
}
