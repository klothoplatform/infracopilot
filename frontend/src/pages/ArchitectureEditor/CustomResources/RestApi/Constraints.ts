import { NodeId } from "../../../../shared/architecture/TopologyNode";
import TopologyEdge from "../../../../shared/architecture/TopologyEdge";
import type { Node } from "reactflow";
import type { Constraint } from "../../../../shared/architecture/Constraints";
import {
  ApplicationConstraint,
  ConstraintOperator,
  EdgeConstraint,
  ResourceConstraint,
} from "../../../../shared/architecture/Constraints";
import { type EnvironmentVersion } from "../../../../shared/architecture/EnvironmentVersion";

export enum RouteOperation {
  Add = "Add",
  Remove = "Remove",
  Modify = "Modify",
}

// createModifyRouteConstraints returns resource constraints to modify an existing route - reusing the existing integration and method resources
export function createModifyRouteConstraints(
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
export function createRemoveRouteConstraints(
  integrationId: NodeId,
  methodId?: NodeId,
) {
  const constraints: Constraint[] = [
    new ApplicationConstraint(ConstraintOperator.Remove, integrationId),
  ];
  if (methodId) {
    constraints.unshift(
      new ApplicationConstraint(ConstraintOperator.Remove, methodId),
    );
  }
  return constraints;
}

export function createAddRouteConstraints(
  restApiId: NodeId,
  method: string,
  route: string,
  environmentVersion: EnvironmentVersion,
  index: number,
) {
  const existingIntegrations = environmentVersion.edges
    .filter(
      (e) =>
        e.source.equals(restApiId) && e.destination.type === "api_integration",
    )
    .map((e) => e.destination);
  // a route is a combination of an integration + its upstream method
  const existingRoutes = existingIntegrations.map((integrationId) => {
    const integration = environmentVersion.resources.get(
      integrationId.toString(),
    );
    const methodId = integration?.Method;
    const method = environmentVersion.resources.get(methodId)?.HttpMethod;
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

export function restApiCreationConstraintsModifier(
  node: Node,
  environmentVersion: EnvironmentVersion,
  defaultConstraints: Constraint[],
) {
  // eslint-disable-next-line no-template-curly-in-string
  const routeConstraints = createAddRouteConstraints(
    node.data.resourceId,
    "ANY",
    "/{proxy+}",
    environmentVersion,
    0,
  );
  return [...defaultConstraints, ...routeConstraints];
}

export function apiIntegrationNodeModifier(
  node: Node,
  environmentVersion: EnvironmentVersion,
) {
  let routeInfo = { method: "UNKNOWN", path: "UNKNOWN" };
  const resource = environmentVersion.resources?.get(
    node.data.resourceId.toString(),
  );
  if (!resource) {
    node.data.resourceMeta = routeInfo;
    return;
  }
  const path = resource["Route"];
  const method = (environmentVersion.resources?.get(resource["Method"]) ?? {})[
    "HttpMethod"
  ];
  node.data.resourceMeta = { method, path };
}
