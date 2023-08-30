import TopologyEdge from "./TopologyEdge";
import { TopologyNode, NodeId } from "./TopologyNode";
import yaml from "yaml";
import { createContext } from "react";
import type { Architecture } from "./Architecture";

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

export const ArchitectureContext = createContext({
  architecture: {} as Architecture,
  setArchitecture: (architecture: Architecture) => {},
});

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
        graph.Edges.push(new TopologyEdge(sourceId, targetId, {}));
        edgeDefinedNodes.push(sourceId, targetId);
      } else {
        graph.Nodes.push(
          new TopologyNode(NodeId.fromString(k, graph.Provider), {
            ...resources[k],
            parent: resources[k]?.parent
              ? NodeId.fromString(resources[k]?.parent, graph.Provider)
              : undefined,
          }),
        );
      }
    });
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
