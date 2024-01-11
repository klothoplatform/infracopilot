import type { Constraint } from "../../../../shared/architecture/Constraints";
import {
  convertAlbToNlb,
  convertNlbToAlb,
  deleteRemovedRules,
  updateListener,
  updateListenerRules,
} from "./Constraints";
import { getDownstreamListener, getDownstreamListenerRules } from "./Util";
import { ApplicationError } from "../../../../shared/errors";
import type { NodeId } from "../../../../shared/architecture/TopologyNode";
import { type EnvironmentVersion } from "../../../../shared/architecture/EnvironmentVersion";

export function loadBalancerFormStateBuilder(
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
) {
  const lb = environmentVersion.resources?.get(resourceId.toString());
  if (!lb) {
    return {};
  }
  if (lb.Type !== "application") {
    return {}; // this is an NLB
  }
  const listenerId = getDownstreamListener(environmentVersion, resourceId);
  if (!listenerId) {
    return {};
  }
  const rules = getDownstreamListenerRules(listenerId, environmentVersion);
  const listener = environmentVersion.resources?.get(listenerId.toString());
  const formValues: any = {
    Protocol: listener?.Protocol,
    Port: listener?.Port,
    Rules: [],
  };
  rules
    .sort((r1, r2) => (r1.Priority ?? 50000) - (r2.Priority ?? 50000))
    .forEach((rule: any) => {
      const requestMethods: any[] = [];
      const pathPattern: any[] = [];
      rule.Conditions?.forEach((c: any) => {
        if (c.HttpRequestMethod?.Values?.length) {
          requestMethods.push(...c.HttpRequestMethod.Values);
          return;
        }
        if (c.PathPattern?.Values?.length) {
          pathPattern.push(...c.PathPattern.Values);
          return;
        }
      });
      formValues.Rules.push({
        id: rule.id,
        HttpRequestMethod: requestMethods.map((m: any) => ({ value: m })),
        PathPattern: pathPattern.map((p: any) => ({ value: p })),
      });
    });
  return {
    [`${resourceId}#Listener`]: formValues,
  };
}

export function handleLBTypeFormState(
  submittedValues: any,
  defaultValues: any,
  modifiedValues: Map<string, any>,
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
): Constraint[] {
  modifiedValues = new Map(
    [...modifiedValues].map(([k, v]) => [k.replace(/^[^#]*#/, ""), v]),
  );

  const constraints: Constraint[] = [];
  if (modifiedValues.has("Type")) {
    switch (modifiedValues.get("Type")) {
      case "network":
        constraints.push(...convertAlbToNlb(resourceId, environmentVersion));
        break;
      case "application":
        constraints.push(...convertNlbToAlb(resourceId, environmentVersion));
        break;
      default:
        throw new ApplicationError({
          message: `Unknown load balancer type: ${submittedValues.Type}`,
          errorId: "AlbFormStateHandler:UnknownType",
        });
    }
  }
  return constraints;
}

export function handleAlbListenerFormState(
  submittedValues: any,
  defaultValues: any,
  modifiedValues: Map<string, any>,
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
): Constraint[] {
  modifiedValues = new Map(
    [...modifiedValues].map(([k, v]) => [k.replace(/^[^#]*#/, ""), v]),
  );

  const constraints: Constraint[] = [];
  if (submittedValues.Type === "network") {
    return constraints;
  }

  constraints.push(...updateListener(resourceId, environmentVersion, modifiedValues));

  constraints.push(
    ...updateListenerRules(
      resourceId,
      defaultValues,
      submittedValues,
      modifiedValues,
      environmentVersion,
    ),
  );
  constraints.push(
    ...deleteRemovedRules(resourceId, defaultValues, modifiedValues),
  );
  return constraints;
}
