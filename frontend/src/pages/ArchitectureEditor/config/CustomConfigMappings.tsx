import {
  apiIntegrationNodeModifier,
  handleRoutesState,
  restApiCreationConstraintsModifier,
  restApiFormStateBuilder,
} from "../CustomResources/RestApiRoute/RestApiRouteConfig";
import type { FC } from "react";
import type { Architecture } from "../../../shared/architecture/Architecture";
import type { NodeId } from "../../../shared/architecture/TopologyNode";
import type { ResourceType } from "../../../shared/resources/ResourceTypes";
import type { Constraint } from "../../../shared/architecture/Constraints";
import type { NodeType } from "../../../shared/reactflow/NodeTypes";
import type { Edge, Node } from "reactflow";
import type { ElkNode } from "elkjs/lib/elk.bundled";
import {
  restApiIntegrationResourceCustomizer,
  RestApiRouteConfig,
} from "../CustomResources/RestApiRoute/ConfigCustomizer";
import { restApiLayoutModifier } from "../CustomResources/RestApiRoute/LayoutModifier";
import { type EnvironmentVersion } from "../../../shared/architecture/EnvironmentVersion";

export type ConfigSections = {
  [key: string]: {
    component?: FC<any>;
    stateHandler?: (
      submittedValues: any,
      defaultValues: any,
      modifiedValues: Map<string, any>,
      resourceId: NodeId,
      architecture: EnvironmentVersion,
    ) => any;
  };
};

export interface CustomConfigMap {
  [key: string]: CustomConfigMapping;
}

export interface CustomConfigMapping {
  creationConstraintsModifier?: (
    node: Node,
    architecture: EnvironmentVersion,
    defaultConstraints: Constraint[],
  ) => Constraint[];
  sections: ConfigSections;
  stateBuilder: FormStateBuilder;
  constraintBuilder?: ConstraintBuilder;
  nodeModifier?: (node: Node, architecture: EnvironmentVersion) => void;
  resourceTypeModifier?: ResourceTypeModifier;
  layoutModifier?: LayoutModifier;
}

export const customConfigMappings: CustomConfigMap = {
  "aws:rest_api": {
    creationConstraintsModifier: restApiCreationConstraintsModifier,
    layoutModifier: restApiLayoutModifier,
    stateBuilder: restApiFormStateBuilder,
    resourceTypeModifier: restApiIntegrationResourceCustomizer,
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
  architecture: EnvironmentVersion,
): any {
  return customConfigMappings[
    `${resourceId.provider}:${resourceId.type}`
  ]?.stateBuilder(resourceId, architecture);
}

export type ResourceTypeModifier = (resourceType: ResourceType) => void;

export type FormStateBuilder = (
  resourceId: NodeId,
  architecture: EnvironmentVersion,
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
