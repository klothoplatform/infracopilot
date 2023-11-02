import { NodeId } from "../../../../shared/architecture/TopologyNode";
import TopologyEdge from "../../../../shared/architecture/TopologyEdge";
import type { Architecture } from "../../../../shared/architecture/Architecture";
import type { Node } from "reactflow";
import type { Constraint } from "../../../../shared/architecture/Constraints";
import {
  ApplicationConstraint,
  ConstraintOperator,
  EdgeConstraint,
  ResourceConstraint,
} from "../../../../shared/architecture/Constraints";

enum RouteOperation {
  Add = "Add",
  Remove = "Remove",
  Modify = "Modify",
}

interface RouteModification {
  oldPath?: string;
  oldMethod?: string;
  newMethod?: string;
  newPath?: string;
  index: number;
  operation: RouteOperation;
  integrationResource?: NodeId;
  methodResource?: NodeId;
}

export const handleRoutesState = (
  submittedValues: any,
  defaultValues: any,
  modifiedValues: Map<string, any>,
  restApi: NodeId,
  architecture: Architecture,
) => {
  const routeChanges = getRouteChanges(
    submittedValues,
    defaultValues,
    modifiedValues,
  );

  const constraints: Constraint[] = [];

  routeChanges.forEach((routeChange) => {
    const {
      index,
      oldMethod,
      oldPath,
      newPath,
      newMethod,
      integrationResource,
      methodResource,
      operation,
    } = routeChange;
    switch (operation) {
      case RouteOperation.Add:
        if (!newMethod || !newPath) {
          throw new Error(
            `Missing method or path for ${restApi.toString()}.Routes[${
              routeChange.index
            }]`,
          );
        }
        constraints.push(
          ...createAddRouteConstraints(
            restApi,
            newMethod,
            newPath,
            architecture,
            index,
          ),
        );
        break;
      case RouteOperation.Remove:
        if (!integrationResource) {
          throw new Error(
            `Missing integration resource for ${restApi.toString()}.Routes[${
              routeChange.index
            }]`,
          );
        }
        constraints.push(
          ...createRemoveRouteConstraints(integrationResource, methodResource),
        );
        break;
      case RouteOperation.Modify:
        if (
          !newMethod ||
          !newPath ||
          methodResource === undefined ||
          integrationResource === undefined
        ) {
          throw new Error(
            `Missing method or path for ${restApi.toString()}.Routes[${
              routeChange.index
            }]`,
          );
        }
        constraints.push(
          ...createModifyRouteConstraints(
            oldMethod,
            oldPath,
            newMethod,
            newPath,
            methodResource,
            integrationResource,
          ),
        );
        break;
    }
  });
  return constraints;
};

// createModifyRouteConstraints returns resource constraints to modify an existing route - reusing the existing integration and method resources
function createModifyRouteConstraints(
  oldMethod: string | undefined,
  oldPath: string | undefined,
  newMethod: string,
  newPath: string,
  methodId: NodeId,
  integrationId: NodeId,
) {
  const constraints: Constraint[] = [];
  if (oldMethod !== newMethod) {
    constraints.push(
      new ResourceConstraint(
        ConstraintOperator.Equals,
        methodId,
        "HttpMethod",
        newMethod,
      ),
    );
  }
  if (oldPath !== newPath) {
    constraints.push(
      new ResourceConstraint(
        ConstraintOperator.Equals,
        integrationId,
        "Route",
        newPath,
      ),
    );
  }
  return constraints;
}

// createRemoveRouteConstraints returns application constraints to remove an existing route
function createRemoveRouteConstraints(
  integrationId: NodeId,
  methodId?: NodeId,
) {
  const constraints: Constraint[] = [
    new ApplicationConstraint(ConstraintOperator.Remove, integrationId),
  ];
  if (methodId) {
    constraints.push(
      new ApplicationConstraint(ConstraintOperator.Remove, methodId),
    );
  }
  return constraints;
}

function createAddRouteConstraints(
  restApiId: NodeId,
  method: string,
  route: string,
  architecture: Architecture,
  index: number,
) {
  const existingIntegrations = architecture.edges
    .filter(
      (e) =>
        e.source.equals(restApiId) && e.destination.type === "api_integration",
    )
    .map((e) => e.destination);
  // a route is a combination of an integration + its upstream method
  const existingRoutes = existingIntegrations.map((integrationId) => {
    const integration = architecture.resources.get(integrationId.toString());
    const methodId = integration?.Method;
    const method = architecture.resources.get(methodId)?.HttpMethod;
    const route = integration?.Route;
    return { [`${method}:${route}`]: integrationId };
  });

  // create integration name with unique incrementing numeric suffix based on existing integrations
  let i = index;
  const integrationId = new NodeId(
    "api_integration",
    restApiId.name,
    `${restApiId.name}_integration_${i}`,
    "aws",
  );
  const alreadyExists = (existing: NodeId) => existing.equals(integrationId);
  while (existingIntegrations.find(alreadyExists)) {
    i++;
    integrationId.name = `${restApiId.name}_integration_${i}`;
  }

  // ignore if route already exists
  if (existingRoutes.some((r) => Object.keys(r)[0] === `${method}:${route}`)) {
    return [];
  }

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
      methodId.toString(),
    ),
    new ResourceConstraint(
      ConstraintOperator.Equals,
      integrationId,
      "Route",
      route,
    ),
  ];
}

export const restApiFormStateBuilder = (
  resourceId: NodeId,
  architecture: Architecture,
) => {
  const integrationIds = architecture.edges
    .map((edge) => {
      if (
        edge.source.qualifiedType === "aws:api_integration" &&
        edge.destination.equals(resourceId)
      ) {
        return edge.source;
      }
      if (
        edge.destination.qualifiedType === "aws:api_integration" &&
        edge.source.equals(resourceId)
      ) {
        return edge.destination;
      }
      return undefined;
    })
    .filter((edge) => edge) as NodeId[];
  const routes = integrationIds
    .map((id) => ({
      id,
      resource: architecture.resources.get(id.toString()),
    }))
    .filter(({ id, resource }) => resource)
    .map(({ id, resource }) => {
      const method = architecture.resources.get(resource["Method"]);
      return {
        Method: (method ?? ({} as any))["HttpMethod"],
        Path: resource["Route"],
        IntegrationResource: id.toString(),
        MethodResource: method ? resource["Method"] : undefined,
      };
    });

  return {
    Routes: routes,
  };
};

export function apiIntegrationNodeModifier(
  node: Node,
  architecture: Architecture,
) {
  let routeInfo = { method: "UNKNOWN", path: "UNKNOWN" };
  const resource = architecture.resources?.get(node.data.resourceId.toString());
  if (!resource) {
    node.data.resourceMeta = routeInfo;
    return;
  }
  const path = resource["Route"];
  const method = (architecture.resources?.get(resource["Method"]) ?? {})[
    "HttpMethod"
  ];
  node.data.resourceMeta = { method, path };
}

// getRouteChanges returns the route values as well as the type of operation to perform on the routes
function getRouteChanges(
  submittedValues: any,
  defaultValues: any,
  modifiedValues: Map<string, any>,
): RouteModification[] {
  const routeChanges: RouteModification[] = [];
  const submittedRoutes = submittedValues.Routes as any[];
  const defaultRoutes = defaultValues.Routes as any[];
  const modifiedIndices = [
    ...new Set<string>(
      [...modifiedValues.keys()]
        .map((k) => k.split(".")[0])
        .filter((k) => k.startsWith("Routes[")),
    ),
  ];

  const removedRoutes = modifiedIndices
    .filter(
      (index) =>
        !modifiedValues.get(`${index}.Path`) &&
        !modifiedValues.get(`${index}.Method`),
    )
    .map((index) => parseInt(index.split("[")[1].split("]")[0]))
    .map((index) => ({
      oldMethod: defaultRoutes[index].Method,
      oldPath: defaultRoutes[index].Path,
      methodResource: defaultRoutes[index].MethodResource,
      integrationResource: defaultRoutes[index].IntegrationResource,
      index,
    }));

  const modifiedRoutes = modifiedIndices
    .filter(
      (index) =>
        modifiedValues.get(`${index}.Path`) ||
        modifiedValues.get(`${index}.Method`),
    )
    .map((index) => parseInt(index.split("[")[1].split("]")[0]))
    .filter((index) => defaultRoutes[index])
    .map((index) => ({
      integrationResource: defaultRoutes[index].IntegrationResource,
      methodResource: defaultRoutes[index].MethodResource,
      oldMethod: defaultRoutes[index].Method,
      oldPath: defaultRoutes[index].Path,
      newPath: submittedRoutes[index].Path,
      newMethod: submittedRoutes[index].Method,
      index,
    }));
  const addedRoutes = modifiedIndices
    .map((index) => parseInt(index.split("[")[1].split("]")[0]))
    .filter((index) => !defaultRoutes[index])
    .map((index) => ({
      newMethod: submittedRoutes[index].Method,
      newPath: submittedRoutes[index].Path,
      index,
    }));

  addedRoutes.forEach((route) => {
    routeChanges.push({
      newPath: route.newPath,
      newMethod: route.newMethod,
      index: route.index,
      operation: RouteOperation.Add,
    });
  });
  modifiedRoutes.forEach((route) => {
    routeChanges.push({
      newPath: route.newPath,
      newMethod: route.newMethod,
      index: route.index,
      operation: RouteOperation.Modify,
      methodResource: NodeId.parse(route.methodResource),
      integrationResource: NodeId.parse(route.integrationResource),
    });
  });
  removedRoutes.forEach((route) => {
    routeChanges.push({
      oldPath: route.oldPath,
      oldMethod: route.oldMethod,
      index: route.index,
      operation: RouteOperation.Remove,
      methodResource: NodeId.parse(route.methodResource),
      integrationResource: NodeId.parse(route.integrationResource),
    });
  });
  return routeChanges;
}
