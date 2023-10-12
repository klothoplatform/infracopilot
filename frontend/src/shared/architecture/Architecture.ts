import type { Edge, Node } from "reactflow";
import { NodeType } from "../reactflow/NodesTypes";
import type TopologyEdge from "./TopologyEdge";
import yaml from "yaml";
import { TopologyGraph } from "./TopologyGraph";
import type { TopologyNode } from "./TopologyNode";
import { NodeId } from "./TopologyNode";

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
  raw_state: {
    resources_yaml: string;
    topology_yaml: string;
  };
  decisions: any[];
  failures: any[];
  version: number;
  name: string;
  owner: string;
  views: Map<ArchitectureView, TopologyGraph>;
  resources: Map<string, object>;
  edges: GraphEdge[];
}

export interface GraphEdge {
  source: NodeId;
  destination: NodeId;
  metadata: object;
}

export function getDownstreamResources(
  architecture: Architecture,
  resourceId: NodeId,
): NodeId[] {
  const result: NodeId[] = [];
  if (architecture.raw_state?.resources_yaml === undefined) {
    return [];
  }

  architecture.edges.forEach((edge: GraphEdge) => {
    if (edge.source.toKlothoIdString() === resourceId.toKlothoIdString()) {
      result.push(edge.destination);
    }
  });
  return result;
}

/**
 * getNodesFromGraph converts a ResourceGraph's nodes to ReactFlow nodes and sorts them
 * to ensure that groups are rendered before their children.
 */
function getNodesFromGraph(topology: TopologyGraph): Node[] {
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
    nodes: getNodesFromGraph(topology),
    edges: getEdgesFromGraph(topology),
  };
}

export function parseArchitecture(data: ArrayBuffer): Architecture {
  const architectureJSON = JSON.parse(new TextDecoder().decode(data));

  const architecture: Architecture = {
    provider: architectureJSON.provider,
    id: architectureJSON.id,
    engineVersion: architectureJSON.engineVersion,
    raw_state: {
      resources_yaml: architectureJSON.state?.resources_yaml,
      topology_yaml: architectureJSON.state?.topology_yaml,
    },
    decisions: architectureJSON.decisions,
    failures: architectureJSON.failures,
    version: architectureJSON.version,
    name: architectureJSON.name,
    owner: architectureJSON.owner,
    resources: new Map<string, object>(),
    edges: [],
    views: new Map<ArchitectureView, TopologyGraph>(),
  };

  if (architectureJSON.state?.topology_yaml) {
    architecture.views.set(
      ArchitectureView.DataFlow,
      TopologyGraph.parse(
        (architectureJSON.state?.topology_yaml as string) ?? "",
      ),
    );
  }

  if (architectureJSON.state?.resources_yaml) {
    const parsedState = yaml.parse(architectureJSON.state?.resources_yaml);
    if (parsedState?.resources) {
      architecture.resources = new Map<string, object>(
        Object.keys(parsedState.resources).map((key) => [
          key,
          parsedState.resources[key],
        ]),
      );
    }
    if (parsedState?.edges) {
      architecture.edges = Object.keys(parsedState.edges).map((key) => {
        const [source, destination] = key.split("->").map((id) => id.trim());
        return {
          source: NodeId.fromId(source),
          destination: NodeId.fromId(destination),
          metadata: parsedState.edges[key],
        } as GraphEdge;
      });
    }
  }
  console.log("architecture: ", architecture);
  return architecture;
}
