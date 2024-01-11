import ResourceNode from "./ResourceNode";
import ResourceGroupNode from "./ResourceGroupNode";
import { IndicatorNode } from "./IndicatorNode";
import ApiIntegrationNode from "../../pages/ArchitectureEditor/CustomResources/RestApi/ApiIntegrationNode";
import LoadBalancerListenerRuleNode from "../../pages/ArchitectureEditor/CustomResources/LoadBalancer/LoadBalancerListenerRuleNode";

/**
 * Add any custom react-flow nodes here to ensure they're available in all views
 */
const nodeTypes = {
  apiIntegration: ApiIntegrationNode,
  loadBalancerListenerRule: LoadBalancerListenerRuleNode,
  indicatorNode: IndicatorNode,
  resourceGroup: ResourceGroupNode,
  resourceNode: ResourceNode,
};

export enum NodeType {
  Resource = "resourceNode",
  ResourceGroup = "resourceGroup",
  Indicator = "indicatorNode",
  ApiIntegration = "apiIntegration",
  LoadBalancerListenerRule = "loadBalancerListenerRule",
}

export const allGroupTypes = new Set<string>([NodeType.ResourceGroup]);
export const allNodeTypes = new Set<string>([
  NodeType.Resource,
  NodeType.Indicator,
  NodeType.ApiIntegration,
  NodeType.LoadBalancerListenerRule,
]);

export const customNodeMappings = new Map<string, NodeType>([
  ["aws:api_integration", NodeType.ApiIntegration],
  ["aws:load_balancer_listener_rule", NodeType.LoadBalancerListenerRule],
]);

export default nodeTypes;
