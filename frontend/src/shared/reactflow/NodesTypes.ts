import ResourceNode from "./ResourceNode";
import ResourceGroupNode from "./ResourceGroupNode";
import { IndicatorNode } from "./IndicatorNode";

/**
 * Add any custom react-flow nodes here to ensure they're available in all views
 */
const nodeTypes = {
  resourceNode: ResourceNode,
  resourceGroup: ResourceGroupNode,
  indicatorNode: IndicatorNode,
};

export enum NodeType {
  Resource = "resourceNode",
  ResourceGroup = "resourceGroup",
  Indicator = "indicatorNode",
}

export const allGroupTypes: Set<string> = new Set([NodeType.ResourceGroup]);
export const allNodeTypes: Set<string> = new Set([
  NodeType.Resource,
  NodeType.Indicator,
]);

export default nodeTypes;
