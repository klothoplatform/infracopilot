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
        let source, target;
        if (k.includes("->") || k.includes("<-")) {
          if (k.includes("->")) {
            [source, target] = k.split("->");
          } else {
            [target, source] = k.split("<-");
          }
          const sourceId = NodeId.fromString(source, graph.Provider);
          const targetId = NodeId.fromString(target, graph.Provider);
          console.log("resources of k ", resources[k], k, sourceId, targetId);
          graph.Edges.push(
            new TopologyEdge(sourceId, targetId, {
              path: resources[k]?.path
                ? resources[k]?.path
                    .split(",")
                    .map((p: string) => NodeId.fromId(p))
                : undefined,
            }),
          );
          console.log(graph.Edges);
          edgeDefinedNodes.push(sourceId, targetId);
        } else {
          graph.Nodes.push(
            new TopologyNode(NodeId.fromString(k, graph.Provider), {
              ...resources[k],
              parent: resources[k]?.parent
                ? NodeId.fromString(resources[k]?.parent, graph.Provider)
                : undefined,
              children: resources[k]?.children
                ? resources[k]?.children
                    .split(",")
                    .map((c: string) => NodeId.fromId(c))
                : undefined,
            }),
          );
        }
        edgeDefinedNodes.forEach((r) => {
          if (
            !graph.Nodes.find(
              (n: TopologyNode) => n.id.toString() === r.toTopologyString(),
            )
          ) {
            graph.Nodes.push(new TopologyNode(r, {}));
          }
        });
      });
    }
    return graph;
  }
}
