import { NodeId } from "../../../../shared/architecture/TopologyNode";
import type { Architecture } from "../../../../shared/architecture/Architecture";
import type { Constraint } from "../../../../shared/architecture/Constraints";
import {
  createAddRouteConstraints,
  createModifyRouteConstraints,
  createRemoveRouteConstraints,
  RouteOperation,
} from "./Constraints";

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
    [`${resourceId}#Routes`]: routes,
  };
};

// getRouteChanges returns the route values as well as the type of operation to perform on the routes
export function getRouteChanges(
  submittedValues: any,
  defaultValues: any,
  modifiedValues: Map<string, any>,
): RouteModification[] {
  const routeChanges: RouteModification[] = [];
  const submittedRoutes = (Object.entries(submittedValues).find(([key]) =>
    key.endsWith("#Routes"),
  )?.[1] ?? []) as any[];
  const defaultRoutes = (Object.entries(defaultValues).find(([key]) =>
    key.endsWith("#Routes"),
  )?.[1] ?? []) as any[];
  if (!submittedRoutes) {
    return routeChanges;
  }
  const modifiedKeys = [
    ...new Set<string>(
      [...modifiedValues.keys()]
        .filter((k) => {
          return k.split("#", 2)[1].split(".")[0].startsWith("Routes[");
        })
        .map((k) => {
          const m = k.match(/(.*#Routes\[(\d+)\])/);
          return m ? m[1] : "";
        }),
    ),
  ];

  const removedRoutes = modifiedKeys
    .filter((index) => {
      const path = modifiedValues.get(`${index}.Path`);
      const method = modifiedValues.get(`${index}.Method`);
      const result = !path && !method;
      return result;
    })
    .map((index) => {
      const m = index.match(/\[(\d+)\]/);
      return m ? parseInt(m[1]) : 0;
    })
    .map((index) => ({
      oldMethod: defaultRoutes[index].Method,
      oldPath: defaultRoutes[index].Path,
      methodResource: defaultRoutes[index].MethodResource,
      integrationResource: defaultRoutes[index].IntegrationResource,
      index,
    }));

  const modifiedRoutes = modifiedKeys
    .filter(
      (index) =>
        modifiedValues.get(`${index}.Path`) ||
        modifiedValues.get(`${index}.Method`),
    )
    .map((index) => {
      const m = index.match(/\[(\d+)\]/);
      return m ? parseInt(m[1]) : 0;
    })
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

  const addedRoutes = modifiedKeys
    .map((index) => {
      const m = index.match(/\[(\d+)\]/);
      return m ? parseInt(m[1]) : 0;
    })
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

export const handleRoutesState = (
  submittedValues: any,
  defaultValues: any,
  modifiedValues: Map<string, any>,
  restApi: NodeId,
  architecture: Architecture,
): Constraint[] => {
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
