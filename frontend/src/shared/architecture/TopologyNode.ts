const UNKNOWN_PROVIDER = "UNKNOWN";

export interface TopologyNodeData {
  parent?: NodeId;
  children?: NodeId[];
}

export class TopologyNode {
  constructor(
    public resourceId: NodeId,
    public vizMetadata: Partial<TopologyNodeData> = {},
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
    return `${this.provider}:${this.type}${
      this.namespace || this.name.includes(":") ? ":" + this.namespace : ""
    }:${this.name}`;
  }

  get qualifiedType(): string {
    return `${this.provider}:${this.type}`;
  }

  // parse a node id from a topology resource id string: provider:type:namespace/name
  public static fromTopologyId(
    input: string,
    defaultProvider?: string,
  ): NodeId {
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

  // parse a node id from a klotho resource id string: provider:type:namespace:name
  public static parse(input: string): NodeId {
    if (!input) {
      return new NodeId("", "", "");
    }
    const chunks = input.split(":");
    if (chunks.length === 4) {
      const [provider, type, namespace, name] = chunks;
      return new NodeId(type, namespace, name, provider);
    } else if (chunks.length === 3) {
      const [provider, type, name] = chunks;
      return new NodeId(type, "", name, provider);
    } else {
      throw new Error(`Invalid node id: ${input}`);
    }
  }

  equals(other?: NodeId): boolean {
    if (!other) {
      return false;
    }
    return (
      this.type === other.type &&
      this.namespace === other.namespace &&
      this.name === other.name &&
      this.provider === other.provider
    );
  }

  public compare(other: NodeId): number {
    if (this.provider !== other.provider) {
      return this.provider.localeCompare(other.provider);
    }
    if (this.type !== other.type) {
      return this.type.localeCompare(other.type);
    }
    if (this.namespace !== other.namespace) {
      return this.namespace.localeCompare(other.namespace);
    }
    return this.name.localeCompare(other.name);
  }
}
