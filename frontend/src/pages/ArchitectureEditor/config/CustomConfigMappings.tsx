import type { FC } from "react";
import type { NodeId } from "../../../shared/architecture/TopologyNode";
import type { ResourceType } from "../../../shared/resources/ResourceTypes";
import type { Constraint } from "../../../shared/architecture/Constraints";
import type { NodeType } from "../../../shared/reactflow/NodeTypes";
import type { Edge, Node } from "reactflow";
import type { ElkNode } from "elkjs/lib/elk.bundled";

import LoadBalancerConfig from "../CustomResources/LoadBalancer";
import RestApiConfig from "../CustomResources/RestApi";
import { type EnvironmentVersion } from "../../../shared/architecture/EnvironmentVersion";

export type ConfigSections = {
  [key: string]: {
    component?: FC<any>;
    stateHandler?: FormStateHandler;
  };
};

export type FormStateHandler = (
  submittedValues: any,
  defaultValues: any,
  modifiedValues: Map<string, any>,
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
) => Constraint[];

export interface CustomConfigMapping {
  creationConstraintsModifier?: (
    node: Node,
    environmentVersion: EnvironmentVersion,
    defaultConstraints: Constraint[],
  ) => Constraint[];
  sections: ConfigSections;
  stateBuilder: FormStateBuilder;
  constraintBuilder?: ConstraintBuilder;
  nodeModifier?: (node: Node, environmentVersion: EnvironmentVersion) => void;
  resourceTypeModifier?: ResourceTypeModifier;
  layoutModifier?: LayoutModifier;
  stateHandler?: FormStateHandler;
}

export interface CustomConfigMap {
  [key: string]: CustomConfigMapping;
}

export const customConfigMappings: CustomConfigMap =
  resolveCustomConfigMappings();

function resolveCustomConfigMappings(): CustomConfigMap {
  return mergeMappings([RestApiConfig, LoadBalancerConfig]);
}

function mergeMappings(mappings: CustomConfigMap[]): CustomConfigMap {
  return mappings.reduce((acc, mapping) => {
    return {
      ...acc,
      ...mapping,
    };
  }, {});
}

export function getCustomConfigSections(
  provider: string,
  type: string,
): ConfigSections {
  return customConfigMappings[`${provider}:${type}`]?.sections ?? {};
}

export function getCustomConfigState(
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
): any {
  return customConfigMappings[
    `${resourceId.provider}:${resourceId.type}`
  ]?.stateBuilder(resourceId, environmentVersion);
}

export type ResourceTypeModifier = (resourceType: ResourceType) => void;

export type FormStateBuilder = (
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
) => object;

export type ConstraintBuilder = (
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
  formState: any,
) => Constraint[];

export type NodeDataPopulator = (
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
) => any;

export interface LayoutContext {
  environmentVersion: EnvironmentVersion;
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
