import { Node as ResourceNode } from "../resource-graph/Node";
import { ResourceGraph } from "../resource-graph/ResourceGraph";
import Edge from "../resource-graph/Edge";
import { Node } from "reactflow";

const INDICATOR_NODE_TYPE = "indicatorNode";
const RESOURCE_NODE_TYPE = "resourceNode";
const RESOURCE_GROUP_TYPE = "resourceGroup";
/**
 * getNodesFromGraph converts a ResourceGraph's nodes to ReactFlow nodes and sorts them
 * to ensure that groups are rendered before their children.
 */
export const getNodesFromGraph = (graph: ResourceGraph): Node[] => {
  return graph?.Nodes.map((node: ResourceNode) => {
    return {
      id: node.id,
      position: { x: 0, y: 0 },
      data: {
        ...node.data,
        label: node.resourceId.namespace
          ? `${node.resourceId.namespace}:${node.resourceId.name}`
          : node.resourceId.name,
        resourceId: node.resourceId,
      },
      type:
        node.resourceId.provider === "indicators"
          ? INDICATOR_NODE_TYPE
          : graph.Nodes.find(
              (n) => n.data?.parent?.toString() === node.resourceId.toString(),
            )
          ? RESOURCE_GROUP_TYPE
          : RESOURCE_NODE_TYPE,
      parentNode: graph.Nodes.find(
        (n) => n.resourceId.toString() === node.data?.parent?.toString(),
      )?.id,
      extent: node.data?.parent ? "parent" : undefined,
    } as Node;
  }).sort((a: Node, b: Node) => {
    // groups first
    if (a.type !== RESOURCE_GROUP_TYPE && b.type === RESOURCE_GROUP_TYPE) {
      return 1;
    }
    if (a.type === RESOURCE_GROUP_TYPE && b.type !== RESOURCE_GROUP_TYPE) {
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
    if (a.type === RESOURCE_GROUP_TYPE && b.type === a.type) {
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
};

export const getEdgesFromGraph = (graph: ResourceGraph) => {
  return graph?.Edges.map((edge: Edge) => {
    return {
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      zIndex: 100,
      data: edge.data,
    };
  });
};
