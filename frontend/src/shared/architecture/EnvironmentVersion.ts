import { NodeType } from "../reactflow/NodeTypes";
import type { Edge, Node } from "reactflow";
import { type ResourceTypeKB } from "../resources/ResourceTypeKB";
import { Architecture, type GraphEdge } from "./Architecture";
import { TopologyGraph } from "./TopologyGraph";
import { NodeId, type TopologyNode } from "./TopologyNode";
import type TopologyEdge from "./TopologyEdge";
import yaml from "yaml";
import { customNodeMappings } from "../reactflow/NodeTypes";
import { customConfigMappings } from "../../pages/ArchitectureEditor/config/CustomConfigMappings";
import { ApplicationError } from "../errors";
import { isObject } from "../object-util";
import type { Property } from "../resources/ResourceTypes";

export interface EnvironmentVersion {
  provider: string;
  id: string;
  architecture_id: string;
  raw_state: {
    resources_yaml: string;
    topology_yaml: string;
  };
  version: number;
  created_at?: number;
  created_by?: string;
  views: Map<ArchitectureView, TopologyGraph>;
  resources: Map<string, any>;
  edges: GraphEdge[];
  config_errors: ConfigurationError[];
}

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

export interface ConfigurationError {
  resource: NodeId;
  property: string;
  value?: any;
  error: string;
}

export function getDownstreamResources(
  architecture: EnvironmentVersion,
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

/**
 * getNodesFromGraph converts a ResourceGraph's nodes to ReactFlow nodes and sorts them
 * to ensure that groups are rendered before their children.
 */
function getNodesFromGraph(
  environmentVersion: EnvironmentVersion,
  resourceTypes: ResourceTypeKB,
  view: ArchitectureView,
): Node[] {
  const topology = environmentVersion.views?.get(view);
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
        resource: environmentVersion.resources.get(node.id),
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
        environmentVersion,
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

export function toReactFlowElements(
  architecture: EnvironmentVersion,
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

function getEdgesFromGraph(graph: TopologyGraph): Edge[] {
  console.log("graph edges: ", graph.Edges);
  return graph.Edges.map((edge: TopologyEdge) => {
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

export function parseEnvironmentVersion(
  rawEnvVersion: any,
): EnvironmentVersion {
  console.log("rawEnvVersion: ", rawEnvVersion);
  if (!isObject(rawEnvVersion)) {
    throw new ApplicationError({
      errorId: "ParseEnvironmentVersion",
      message: "EnvironmentVersion state is invalid.",
      data: {
        rawEnvVersion,
      },
    });
  }

  try {
    const environmentVersion: EnvironmentVersion = {
      provider: rawEnvVersion.provider,
      id: rawEnvVersion.id,
      architecture_id: rawEnvVersion.architecture_id,
      raw_state: {
        resources_yaml: rawEnvVersion.state?.resources_yaml,
        topology_yaml: rawEnvVersion.state?.topology_yaml,
      },
      version: rawEnvVersion.version,
      resources: new Map<string, any>(),
      edges: [],
      views: new Map<ArchitectureView, TopologyGraph>(),
      config_errors: rawEnvVersion.config_errors?.map((error: any) => ({
        ...error,
        resource: error.resource ? NodeId.parse(error.resource) : undefined,
      })),
    };

    if (rawEnvVersion.state?.topology_yaml) {
      environmentVersion.views.set(
        ArchitectureView.DataFlow,
        TopologyGraph.parse(
          (rawEnvVersion.state?.topology_yaml as string) ?? "",
        ),
      );
    }

    if (rawEnvVersion.state?.resources_yaml) {
      const parsedState = yaml.parse(rawEnvVersion.state?.resources_yaml);
      if (parsedState?.resources) {
        environmentVersion.resources = new Map<string, any>(
          Object.keys(parsedState.resources).map((id) => [
            id,
            { ...parsedState.resources[id], id: NodeId.parse(id) },
          ]),
        );
      }
      if (parsedState?.edges) {
        environmentVersion.edges = Object.keys(parsedState.edges).map((key) => {
          const [source, destination] = key.split("->").map((id) => id.trim());
          return {
            source: NodeId.parse(source),
            destination: NodeId.parse(destination),
            metadata: parsedState.edges[key],
          } as GraphEdge;
        });
      }
    }
    console.log("environmentVersion: ", environmentVersion);
    return environmentVersion;
  } catch (e: any) {
    throw new ApplicationError({
      errorId: "ParseEnvironmentVersion",
      message: "An error occurred during environment version parsing.",
      cause: e,
      data: {
        rawArchitecture: rawEnvVersion,
      },
    });
  }
}

export function isPropertyPromoted(property: Property): boolean {
  let important =
    (property.important ||
      (property.required &&
        !property.deployTime &&
        !property.configurationDisabled &&
        !property.hidden)) ??
    false;
  if (important) {
    return true;
  }
  for (const p of property.properties ?? []) {
    if (isPropertyPromoted(p)) {
      return true;
    }
  }
  return false;
}

export function resourceProperties(
  version: EnvironmentVersion,
  resourceTypes: ResourceTypeKB,
  resourceId: NodeId,
): Map<NodeId, Property[]> {
  const resType = resourceTypes.getResourceType(
    resourceId.provider,
    resourceId.type,
  );
  const properties = new Map<NodeId, Property[]>();
  if (resType?.properties?.length) {
    // Filter out the properties which should not be shown
    const props = resType.properties.filter(
      (p) => !p.deployTime && !p.configurationDisabled && !p.hidden,
    );
    if (props.length > 0) {
      properties.set(resourceId, props);
    }
  }
  const resNode = version.views
    .get(ArchitectureView.DataFlow)
    ?.Nodes.find((n) => n.resourceId.equals(resourceId));
  // Look deep into the property for potentially nested important properties
  const promotedProp = (p: Property): Property | undefined => {
    const isPromoted = isPropertyPromoted(p);
    if (!isPromoted) {
      return undefined;
    }
    if (p.properties?.length) {
      const props = p.properties.filter(promotedProp);
      if (props.length > 0) {
        p = { ...p, properties: props };
      }
    }
    return p;
  };
  resNode?.vizMetadata?.children?.forEach((child) => {
    const childResType = resourceTypes.getResourceType(
      child.provider,
      child.type,
    );
    // Only pull up the important or required properties from children
    const important =
      childResType?.properties?.reduce((acc: Property[], p) => {
        const prop = promotedProp(p);
        if (prop) {
          acc.push(prop);
        }
        return acc;
      }, []) ?? [];
    if (important.length > 0) {
      properties.set(child, important);
    }
  });
  return properties;
}
