import Edge from "./Edge";
import { Node, NodeId } from "./Node";
import yaml from "yaml";
import { createContext } from "react";

export class ResourceGraph {
  Provider: string;
  Nodes: Node[];
  Edges: Edge[];

  constructor() {
    this.Nodes = [];
    this.Edges = [];
    this.Provider = "";
  }
}

export const ResourceGraphContext = createContext({
  graph: new ResourceGraph(),
  setGraph: (graph: ResourceGraph) => {},
});

export const parse = (content: string): Map<string, ResourceGraph> => {
  const apps = new Map<string, ResourceGraph>();
  const parsed_yaml = yaml.parse(content) as object;
  if (!parsed_yaml) {
    return apps;
  }

  Object.keys(parsed_yaml).forEach((k: string) =>
    apps.set(k, new ResourceGraph())
  );

  apps.forEach((graph: ResourceGraph, appName: string) => {
    const app = parsed_yaml[appName as keyof object];
    if (!app) {
      console.log(`no nodes found for app: ${appName}`);
      return apps;
    }
    const resources = app["resources"] as any;
    graph.Provider = app["provider"] as string;
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
        graph.Edges.push(new Edge(sourceId, targetId, {}));
        edgeDefinedNodes.push(sourceId, targetId);
      } else {
        graph.Nodes.push(
          new Node(NodeId.fromString(k, graph.Provider), {
            ...resources[k],
            parent: resources[k]?.parent
              ? NodeId.fromString(resources[k]?.parent, graph.Provider)
              : undefined,
          })
        );
      }
    });
    edgeDefinedNodes.forEach((r) => {
      if (!graph.Nodes.find((n: Node) => n.id.toString() === r.toString())) {
        graph.Nodes.push(new Node(r, {}));
      }
    });
  });
  return apps;
};
