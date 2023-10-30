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
import TopologyEdge from "../../../shared/architecture/TopologyEdge";
import type { Architecture } from "../../../shared/architecture/Architecture";
import type { LayoutModifier } from "./CustomConfigMappings";
import {
  ElkMap,
  ElkSize,
  flattenHierarchy,
  NodeLayeringStrategy,
  NodePlacementStrategy,
} from "../../../shared/reactflow/AutoLayout";
import type { Node } from "reactflow";
import {
  ApplicationConstraint,
  ConstraintOperator,
  EdgeConstraint,
  ResourceConstraint,
} from "../../../shared/architecture/Constraints";

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
        // hierarchyHandling: "INCLUDE_CHILDREN",
        // "elk.algorithm": "layered",

        // "nodePlacement.strategy": NodePlacementStrategy.SIMPLE,
        // "org.eclipse.elk.layered.layering.strategy":
        //   NodeLayeringStrategy.INTERACTIVE,
        // "org.eclipse.elk.partitioning.activate": "true",
        "elk.spacing.nodeNode": "4",
        "elk.direction": "DOWN",
        "elk.padding": ElkMap({
          top: 30,
          left: 40,
          bottom: 30,
          right: 40,
        }),
      };

      const childIds = restApi.children?.map((child) => child.id);

      // sort children by route path and method
      const childRFNodes = nodes.filter((node) => childIds?.includes(node.id));
      const childPriorities = new Map(
        childRFNodes
          .sort((a, b) => {
            const aRoute = a.data.resourceMeta.path;
            const bRoute = b.data.resourceMeta.path;
            const aMethod = a.data.resourceMeta.method;
            const bMethod = b.data.resourceMeta.method;
            if (aRoute < bRoute) return -1;
            if (aRoute > bRoute) return 1;
            if (aMethod < bMethod) return -1;
            if (aMethod > bMethod) return 1;
            return 0;
          })
          .map((node, index) => [node.id, index]),
      );

      // get longest path length
      const maxLength = childRFNodes.reduce((max, node) => {
        const pathLength = node.data?.resourceMeta?.path.length;
        return pathLength > max ? pathLength : max;
      }, 0);

      restApi.children?.forEach((child) => {
        child.labels = undefined;
        child.layoutOptions = {
          // "org.eclipse.elk.partitioning.partition": `${
          //   childPriorities.get(child.id) ?? 10000
          // }`,
          // "org.eclipse.elk.priority": `${
          //   childPriorities.get(child.id) ?? 10000
          // }`,
          "org.eclipse.elk.nodeSize.minimum": ElkSize(100 + maxLength * 16, 50),
          "org.eclipse.elk.partitioning.activate": "true",
        };
      });
      restApi.children = restApi.children?.sort((a, b) => {
        const aPriority = childPriorities.get(a.id);
        const bPriority = childPriorities.get(b.id);
        if (aPriority === undefined || bPriority === undefined) return 0;
        return aPriority - bPriority;
      });
    });
};

export const apiIntegrationNodeModifier = (
  node: Node,
  architecture: Architecture,
) => {
  let routeInfo = { method: "UNKNOWN", path: "UNKNOWN" };
  const resource = architecture.resources?.get(
    node.data.resourceId.toKlothoIdString(),
  );
  if (!resource) {
    node.data.resourceMeta = routeInfo;
    return;
  }
  const path = resource["Route"];
  const method = (architecture.resources?.get(resource["Method"]) ?? {})[
    "HttpMethod"
  ];
  node.data.resourceMeta = { method, path };
};
