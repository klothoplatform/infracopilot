import type { Edge, Node } from "reactflow";
import type TopologyEdge from "./TopologyEdge";
import yaml from "yaml";
import { TopologyGraph } from "./TopologyGraph";
import type { TopologyNode } from "./TopologyNode";
import { NodeId } from "./TopologyNode";
import type { ResourceTypeKB } from "../resources/ResourceTypeKB";
import { customNodeMappings, NodeType } from "../reactflow/NodeTypes";
import { customConfigMappings } from "../../pages/ArchitectureEditor/config/CustomConfigMappings";

export enum ArchitectureView {
  DataFlow = "dataflow",
  IaC = "iac",
}

export enum ViewNodeType {
  Parent = "parent",
  Big = "big",
  Small = "small",
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
  created_at?: number;
  updated_at?: number;
  updated_by?: string;
  owner: string;
  views: Map<ArchitectureView, TopologyGraph>;
  resources: Map<string, any>;
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
    if (edge.source.equals(resourceId)) {
      result.push(edge.destination);
    }
  });
  return result;
}

function resolveNodeType(
  node: TopologyNode,
  resourceTypes: ResourceTypeKB,
  view: ArchitectureView,
): NodeType {
  if (node.resourceId.provider === "indicators") {
    return NodeType.Indicator;
  }
  const customNode = customNodeMappings.get(node.resourceId.qualifiedType);
  if (customNode) {
    return customNode;
  }

  if (
    resourceTypes
      .getResourceType(node.resourceId.provider, node.resourceId.type)
      ?.views.get(view) === ViewNodeType.Parent
  ) {
    return NodeType.ResourceGroup;
  }
  return NodeType.Resource;
}

/**
 * getNodesFromGraph converts a ResourceGraph's nodes to ReactFlow nodes and sorts them
 * to ensure that groups are rendered before their children.
 */
function getNodesFromGraph(
  architecture: Architecture,
  resourceTypes: ResourceTypeKB,
  view: ArchitectureView,
): Node[] {
  const topology = architecture.views?.get(view);
  if (!topology) {
    return [];
  }
  const rfNodes = topology.Nodes.map((node: TopologyNode) => {
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
      type: resolveNodeType(node, resourceTypes, view),
      parentNode: topology.Nodes.find((n) =>
        n.resourceId.equals(node.vizMetadata.parent),
      )?.id,
      extent: node.vizMetadata.parent ? "parent" : undefined,
    } as Node;
  }).sort(compareNodes);
  rfNodes.map(
    (node: Node) =>
      customConfigMappings[node.data.resourceId.qualifiedType]?.nodeModifier?.(
        node,
        architecture,
      ),
  );
  return rfNodes;
}

function compareNodes(a: Node, b: Node): number {
  // groups first
  if (a.type !== NodeType.ResourceGroup && b.type === NodeType.ResourceGroup) {
    return 1;
  }
  if (a.type === NodeType.ResourceGroup && b.type !== NodeType.ResourceGroup) {
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
  resourceTypes: ResourceTypeKB,
  view: ArchitectureView,
): ReactFlowElements {
  const topology = architecture.views?.get(view);
  if (!topology) {
    return { nodes: [], edges: [] };
  }
  return {
    nodes: getNodesFromGraph(architecture, resourceTypes, view),
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
    resources: new Map<string, any>(),
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
      architecture.resources = new Map<string, any>(
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
          source: NodeId.parse(source),
          destination: NodeId.parse(destination),
          metadata: parsedState.edges[key],
        } as GraphEdge;
      });
    }
  }
  console.log("architecture: ", architecture);
  return architecture;
}
