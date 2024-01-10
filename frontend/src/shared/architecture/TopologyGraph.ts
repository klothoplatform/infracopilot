import TopologyEdge from "./TopologyEdge";
import { NodeId, TopologyNode } from "./TopologyNode";
import yaml from "yaml";

export class TopologyGraph {
  Provider: string;
  Nodes: TopologyNode[];
  Edges: TopologyEdge[];

  constructor() {
    this.Nodes = [];
    this.Edges = [];
    this.Provider = "";
  }

  static parse(content: string): TopologyGraph {
    const parsed_yaml = yaml.parse(content) as object;
    const graph = new TopologyGraph();
    if (!parsed_yaml) {
      return graph;
    }

    const resources = (parsed_yaml as any).resources as any;
    graph.Provider = (parsed_yaml as any).provider as string;
    const edgeDefinedNodes: NodeId[] = [];
    if (resources) {
      Object.keys(resources).forEach((k: string) => {
        const resource = resources[k];

        const keyDelim = k.includes("->") ? "->" : "<-";
        if (k.includes(keyDelim)) {
          let source, target;
          if (keyDelim === "->") {
            [source, target] = k.split(keyDelim);
          } else {
            [target, source] = k.split(keyDelim);
          }
          const sourceId = NodeId.fromTopologyId(source, graph.Provider);
          const targetId = NodeId.fromTopologyId(target, graph.Provider);
          let path: string | string[] | undefined = resource?.path;
          if (typeof path === "string") {
            const pathDelim = resource?.path?.includes(",")
              ? ","
              : resource?.path?.includes("→")
                ? "→"
                : "->";

            path = path?.split(pathDelim);
          }
          const edgeNodes = path?.map((p) => NodeId.parse(p.trim()));
          console.log("resources of k ", {
            resource,
            k,
            sourceId,
            targetId,
            edgeNodes,
          });
          graph.Edges.push(
            new TopologyEdge(sourceId, targetId, {
              path: edgeNodes,
            }),
          );
          console.log(graph.Edges);
          edgeDefinedNodes.push(sourceId, targetId);
        } else {
          let children = resource?.children;
          if (typeof children === "string") {
            children = children.split(",");
          }
          if (children) {
            children = children.map((c: string) => NodeId.parse(c));
          }
          graph.Nodes.push(
            new TopologyNode(NodeId.fromTopologyId(k, graph.Provider), {
              ...resource,
              parent: resource?.parent
                ? NodeId.fromTopologyId(resource?.parent, graph.Provider)
                : undefined,
              children,
            }),
          );
        }
        edgeDefinedNodes.forEach((r) => {
          if (!graph.Nodes.find((n: TopologyNode) => n.resourceId.equals(r))) {
            graph.Nodes.push(new TopologyNode(r, {}));
          }
        });
      });
    }
    return graph;
  }
}
