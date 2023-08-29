import { parse, TopologyGraph } from "./TopologyGraph";
import { sampleGraphYaml } from "./Samples";
import { Edge, Node } from "reactflow";
import { TopologyNode } from "./TopologyNode";
import { NodeType } from "../reactflow/NodesTypes";
import TopologyEdge from "./TopologyEdge";

export enum ArchitectureView {
  DataFlow = "DataFlow",
  IaC = "IaC",
}

export interface ReactFlowElements {
  nodes: Node[];
  edges: Edge[];
}

export interface Architecture {
  provider: string;
  id: string;
  engineVersion: string;
  version: number;
  name: string;
  creator: string;
  owner: string;
  views: Map<ArchitectureView, TopologyGraph>;
  resourceMetadata: object;
}

/**
 * getNodesFromGraph converts a ResourceGraph's nodes to ReactFlow nodes and sorts them
 * to ensure that groups are rendered before their children.
 */
function getNodesFromGraph(
  topology: TopologyGraph,
  resourceMetadata: {}
): Node[] {
  return topology?.Nodes?.map((node: TopologyNode) => {
    return {
      id: node.id,
      position: { x: 0, y: 0 },
      draggable: false,
      data: {
        ...node.vizMetadata,
        label: node.resourceId.namespace
          ? `${node.resourceId.namespace}:${node.resourceId.name}`
          : node.resourceId.name,
        resourceId: node.resourceId,
        resourceMetadata:
          (resourceMetadata as any)?.[node.resourceId.toKlothoIdString()] ?? {},
        vizMetadata: node.vizMetadata,
      },
      type:
        node.resourceId.provider === "indicators"
          ? NodeType.Indicator
          : topology.Nodes.find(
              (n) =>
                n.vizMetadata?.parent?.toTopologyString() ===
                node.resourceId.toTopologyString()
            )
          ? NodeType.ResourceGroup
          : NodeType.Resource,
      parentNode: topology.Nodes.find(
        (n) =>
          n.resourceId.toTopologyString() ===
          node.vizMetadata?.parent?.toTopologyString()
      )?.id,
      extent: node.vizMetadata?.parent ? "parent" : undefined,
    } as Node;
  }).sort((a: Node, b: Node) => {
    // groups first
    if (
      a.type !== NodeType.ResourceGroup &&
      b.type === NodeType.ResourceGroup
    ) {
      return 1;
    }
    if (
      a.type === NodeType.ResourceGroup &&
      b.type !== NodeType.ResourceGroup
    ) {
      return -1;
    }
    // children of groups next
    if (a.parentNode && !b.parentNode) {
      return 1;
    }
    if (!a.parentNode && b.parentNode) {
      return -1;
    }
    // parent groups before their children
    if (a.type === NodeType.ResourceGroup && b.type === a.type) {
      if (a.parentNode === b.id) {
        return 1;
      }
      if (b.parentNode === a.id) {
        return -1;
      }
    }
    // sort by id otherwise
    return a.id.localeCompare(b.id);
  });
}

function getEdgesFromGraph(graph: TopologyGraph): Edge[] {
  return graph?.Edges?.map((edge: TopologyEdge) => {
    return {
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      zIndex: 100,
      data: {
        vizMetadata: edge.vizMetadata,
      },
    };
  });
}

export function toReactFlowElements(
  architecture: Architecture,
  view: ArchitectureView
): ReactFlowElements {
  const topology = architecture.views?.get(view);
  if (!topology) {
    return { nodes: [], edges: [] };
  }
  return {
    nodes: getNodesFromGraph(topology, architecture.resourceMetadata),
    edges: getEdgesFromGraph(topology),
  };
}

export const defaultArchitecture: Architecture = {
  provider: "aws",
  id: "1",
  engineVersion: "1",
  version: 0,
  name: "A new diagram",
  creator: "John Doe",
  owner: "John Doe",
  views: new Map<ArchitectureView, TopologyGraph>([
    [ArchitectureView.DataFlow, parse(sampleGraphYaml).values().next().value],
  ]),
  resourceMetadata: {},
};
