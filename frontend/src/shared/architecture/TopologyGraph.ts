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
}

export const parse = (content: string): Map<string, TopologyGraph> => {
  const apps = new Map<string, TopologyGraph>();
  const parsed_yaml = yaml.parse(content) as object;
  if (!parsed_yaml) {
    return apps;
  }

  Object.keys(parsed_yaml).forEach((k: string) =>
    apps.set(k, new TopologyGraph()),
  );

  apps.forEach((graph: TopologyGraph, appName: string) => {
    const app = parsed_yaml[appName as keyof object];
    if (!app) {
      console.log(`no nodes found for app: ${appName}`);
      return apps;
    }
    const resources = (app as any).resources as any;
    graph.Provider = (app as any).provider as string;
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
      });
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
  return apps;
};
