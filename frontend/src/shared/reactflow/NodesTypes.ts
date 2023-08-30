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

export const allGroupTypes = new Set<string>([NodeType.ResourceGroup]);
export const allNodeTypes = new Set<string>([
  NodeType.Resource,
  NodeType.Indicator,
]);

export default nodeTypes;
