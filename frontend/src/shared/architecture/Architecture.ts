import type { TopologyGraph } from "./TopologyGraph";
import type { Edge, Node } from "reactflow";
import type { TopologyNode } from "./TopologyNode";
import { NodeId } from "./TopologyNode";
import { NodeType } from "../reactflow/NodesTypes";
import type TopologyEdge from "./TopologyEdge";
import yaml from "yaml";

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
  engineVersion: number;
  state: {
    resources_yaml: string;
    topology_yaml: string;
  };
  decisions: any[];
  failures: any[];
  version: number;
  name: string;
  owner: string;
  views: Map<ArchitectureView, TopologyGraph>;
  resourceMetadata: object;
}

export interface GraphEdge {
  source: string;
  destination: string;
}

export function getDownstreamResources(
  architecture: Architecture,
  resourceId: NodeId,
): NodeId[] {
  const result: NodeId[] = [];
  if (architecture.state?.resources_yaml === undefined) {
    return [];
  }
  const edges = yaml.parse(architecture.state.resources_yaml).edges;
  if (!edges) {
    return [];
  }
  edges.forEach((edge: GraphEdge) => {
    if (edge.source === resourceId.toKlothoIdString()) {
      result.push(NodeId.fromId(edge.destination));
    }
  });
  return result;
}

/**
 * getNodesFromGraph converts a ResourceGraph's nodes to ReactFlow nodes and sorts them
 * to ensure that groups are rendered before their children.
 */
function getNodesFromGraph(
  topology: TopologyGraph,
  resourceMetadata: {},
): Node[] {
  return topology.Nodes.map((node: TopologyNode) => {
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
                n.vizMetadata.parent?.toTopologyString() ===
                node.resourceId.toTopologyString(),
            )
          ? NodeType.ResourceGroup
          : NodeType.Resource,
      parentNode: topology.Nodes.find(
        (n) =>
          n.resourceId.toTopologyString() ===
          node.vizMetadata.parent?.toTopologyString(),
      )?.id,
      extent: node.vizMetadata.parent ? "parent" : undefined,
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
  console.log("graph edges: ", graph.Edges);
  return graph.Edges.map((edge: TopologyEdge) => {
    console.log("looking for vizMetadata edge: ", edge);
    return {
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      zIndex: 50,
      data: {
        vizMetadata: edge.vizMetadata,
      },
    };
  });
}

export function toReactFlowElements(
  architecture: Architecture,
  view: ArchitectureView,
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
