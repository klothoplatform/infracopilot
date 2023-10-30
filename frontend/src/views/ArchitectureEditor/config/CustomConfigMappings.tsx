import {
  apiIntegrationNodeModifier,
  handleRoutesState,
  RestApiFormStateBuilder,
  restApiLayoutModifier,
  RestApiRouteConfig,
} from "./RestApiRouteConfig";
import type { FC } from "react";
import type { Architecture } from "../../../shared/architecture/Architecture";
import type { NodeId } from "../../../shared/architecture/TopologyNode";
import type { ResourceType } from "../../../shared/resources/ResourceTypes";
import type { Constraint } from "../../../shared/architecture/Constraints";
import type { NodeType } from "../../../shared/reactflow/NodeTypes";
import type { Edge, Node } from "reactflow";
import type { ElkNode } from "elkjs/lib/elk.bundled";

export type ConfigSections = {
  [key: string]: {
    component?: FC<any>;
    stateHandler?: (state: any, resourceId: NodeId) => any;
  };
};

export const customConfigMappings: {
  [key: string]: {
    sections: ConfigSections;
    stateBuilder: (resourceId: NodeId, architecture: Architecture) => any;
    layoutModifier?: LayoutModifier;
    nodeModifier?: (node: Node, architecture: Architecture) => void;
  };
} = {
  "aws:rest_api": {
    // layoutModifier: restApiLayoutModifier,
    stateBuilder: RestApiFormStateBuilder,
    sections: {
      Routes: {
        component: RestApiRouteConfig,
        stateHandler: handleRoutesState,
      },
    },
  },
  "aws:api_integration": {
    nodeModifier: apiIntegrationNodeModifier,
    sections: {},
    stateBuilder: () => ({}),
  },
};

export function getCustomConfigSections(
  provider: string,
  type: string,
): ConfigSections {
  return customConfigMappings[`${provider}:${type}`]?.sections ?? {};
}

export function getCustomConfigState(
  resourceId: NodeId,
  architecture: Architecture,
): any {
  return customConfigMappings[
    `${resourceId.provider}:${resourceId.type}`
  ]?.stateBuilder(resourceId, architecture);
}

export type ResourceTypeModifier = (resourceType: ResourceType) => ResourceType;

export type FormStateBuilder = (
  resourceId: NodeId,
  architecture: Architecture,
) => object;

export type ConstraintBuilder = (
  resourceId: NodeId,
  architecture: Architecture,
  formState: any,
) => Constraint[];

export type NodeDataPopulator = (
  resourceId: NodeId,
  architecture: Architecture,
) => any;

export interface LayoutContext {
  reactFlow: {
    nodes: Node[];
    edges: Edge[];
  };
  elkGraph: ElkNode;
}
export type LayoutModifier = (context: LayoutContext) => void;

export interface CustomResourceType {
  provider: string;
  type: string;
  resourceTypeModifier?: ResourceTypeModifier;
  formStateBuilder?: FormStateBuilder;
  constraintBuilder?: ConstraintBuilder;
  configSections?: ConfigSections;
  nodeType?: NodeType;
  nodeDataPopulator?: NodeDataPopulator;
  layoutModifier?: LayoutModifier;
}
