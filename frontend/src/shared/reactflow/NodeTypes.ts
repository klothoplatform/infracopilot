import ResourceNode from "./ResourceNode";
import ResourceGroupNode from "./ResourceGroupNode";
import { IndicatorNode } from "./IndicatorNode";
import ApiRouteNode from "./ApiRouteNode";

/**
 * Add any custom react-flow nodes here to ensure they're available in all views
 */
const nodeTypes = {
  apiRoute: ApiRouteNode,
  indicatorNode: IndicatorNode,
  resourceGroup: ResourceGroupNode,
  resourceNode: ResourceNode,
};

export enum NodeType {
  Resource = "resourceNode",
  ResourceGroup = "resourceGroup",
  Indicator = "indicatorNode",
  ApiRoute = "apiRoute",
}

export const allGroupTypes = new Set<string>([NodeType.ResourceGroup]);
export const allNodeTypes = new Set<string>([
  NodeType.Resource,
  NodeType.Indicator,
  NodeType.ApiRoute,
]);

export const customNodeMappings = new Map<string, NodeType>([
  ["aws:api_integration", NodeType.ApiRoute],
]);

export default nodeTypes;
