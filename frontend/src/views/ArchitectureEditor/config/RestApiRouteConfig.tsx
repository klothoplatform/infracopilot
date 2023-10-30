import type { FC } from "react";
import { ConfigSection } from "../../../components/config/ConfigSection";
import type {
  EnumProperty,
  ListProperty,
  Property,
} from "../../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  PrimitiveTypes,
} from "../../../shared/resources/ResourceTypes";
import { ListField } from "../../../components/config/ListField";
import { NodeId } from "../../../shared/architecture/TopologyNode";
import {
  ApplicationConstraint,
  ConstraintOperator,
  EdgeConstraint,
  ResourceConstraint,
} from "../../../shared/architecture/Constraints";
import TopologyEdge from "../../../shared/architecture/TopologyEdge";
import type { Architecture } from "../../../shared/architecture/Architecture";
import type { LayoutModifier } from "./CustomConfigMappings";
import {
  ElkMap,
  ElkSize,
  flattenHierarchy,
} from "../../../shared/reactflow/AutoLayout";

const RoutesField: ListProperty = {
  name: "Routes",
  qualifiedName: "Routes",
  type: CollectionTypes.List,
  itemType: CollectionTypes.Map,
  configurationDisabled: false,
  deployTime: false,
  required: true,
  properties: [
    {
      name: "Method",
      qualifiedName: "Method",
      type: PrimitiveTypes.Enum,
      required: true,
      allowedValues: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
        "ANY",
      ],
    } as EnumProperty,
    {
      name: "Path",
      qualifiedName: "Path",
      type: PrimitiveTypes.String,
      required: true,
    } as Property,
  ],
};

export const handleRoutesState = (routes: any, resourceId: NodeId) => {
  return routes
    .map((route: any) =>
      createAddRouteConstraints(resourceId, route.Method, route.Path),
    )
    .flat();
};

function createAddRouteConstraints(
  restApiId: NodeId,
  method: string,
  route: string,
) {
  const integrationId = new NodeId(
    "api_integration",
    restApiId.name,
    `${restApiId.name}_integration_${Math.random().toString(36).substr(2, 9)}`,
    "aws",
  );
  const methodId = new NodeId(
    "api_method",
    restApiId.name,
    `${integrationId.name}_method`,
    "aws",
  );
  return [
    new ApplicationConstraint(ConstraintOperator.Add, methodId),
    new ApplicationConstraint(ConstraintOperator.Add, integrationId),
    new ResourceConstraint(
      ConstraintOperator.Equals,
      methodId,
      "HttpMethod",
      method,
    ),
    new EdgeConstraint(
      ConstraintOperator.MustExist,
      new TopologyEdge(restApiId, integrationId),
    ),
    new EdgeConstraint(
      ConstraintOperator.MustExist,
      new TopologyEdge(methodId, integrationId),
    ),
    new ResourceConstraint(
      ConstraintOperator.Equals,
      integrationId,
      "Method",
      methodId.toKlothoIdString(),
    ),
    new ResourceConstraint(
      ConstraintOperator.Equals,
      integrationId,
      "Route",
      route,
    ),
  ];
}

export const RestApiFormStateBuilder = (
  resourceId: NodeId,
  architecture: Architecture,
) => {
  const integrationIds = architecture.edges
    .map((edge) => {
      if (
        edge.source.provider === "aws" &&
        edge.source.type === "api_integration" &&
        edge.destination.toKlothoIdString() === resourceId.toKlothoIdString()
      ) {
        return edge.source;
      }
      if (
        edge.destination.provider === "aws" &&
        edge.destination.type === "api_integration" &&
        edge.source.toKlothoIdString() === resourceId.toKlothoIdString()
      ) {
        return edge.destination;
      }
      return undefined;
    })
    .filter((edge) => edge) as NodeId[];
  const routes = integrationIds
    .map((id) => architecture.resources.get(id.toKlothoIdString()) as any)
    .filter((resource) => resource)
    .map((resource) => {
      return {
        Method: (architecture.resources.get(resource["Method"]) ?? ({} as any))[
          "HttpMethod"
        ],
        Path: resource["Route"],
      };
    });

  return {
    Routes: routes,
  };
};

export const RestApiRouteConfig: FC = (props) => {
  return (
    <ConfigSection id="Routes" title="Routes">
      <ListField id="Routes" field={RoutesField} />
    </ConfigSection>
  );
};

export const restApiLayoutModifier: LayoutModifier = ({
  elkGraph,
  reactFlow: { nodes, edges },
}) => {
  const allNodes = flattenHierarchy(elkGraph);

  allNodes
    .filter((node) => node.id.startsWith("aws:rest_api/"))
    .forEach((restApi) => {
      restApi.layoutOptions = {
        ...restApi.layoutOptions,
        "elk.spacing.nodeNode": "4",
        "elk.direction": "DOWN",
        "elk.padding": ElkMap({
          top: 40,
          left: 40,
          bottom: 60,
          right: 40,
        }),
      };

      restApi.children?.forEach((child) => {
        child.labels = undefined;
        child.layoutOptions = {
          "org.eclipse.elk.nodeSize.minimum": ElkSize(400, 50),
        };
      });
    });
};
