import type { Architecture } from "../../../../shared/architecture/Architecture";
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

export function loadBalancerFormStateBuilder(
  resourceId: NodeId,
  architecture: Architecture,
) {
  const lb = architecture.resources?.get(resourceId.toString());
  if (!lb) {
    return {};
  }
  if (lb.Type !== "application") {
    return {}; // this is an NLB
  }
  const listenerId = getDownstreamListener(architecture, resourceId);
  if (!listenerId) {
    return {};
  }
  const rules = getDownstreamListenerRules(listenerId, architecture);
  const listener = architecture.resources?.get(listenerId.toString());
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
  architecture: Architecture,
): Constraint[] {
  modifiedValues = new Map(
    [...modifiedValues].map(([k, v]) => [k.replace(/^[^#]*#/, ""), v]),
  );

  const constraints: Constraint[] = [];
  if (modifiedValues.has("Type")) {
    switch (modifiedValues.get("Type")) {
      case "network":
        constraints.push(...convertAlbToNlb(resourceId, architecture));
        break;
      case "application":
        constraints.push(...convertNlbToAlb(resourceId, architecture));
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
  architecture: Architecture,
): Constraint[] {
  modifiedValues = new Map(
    [...modifiedValues].map(([k, v]) => [k.replace(/^[^#]*#/, ""), v]),
  );

  const constraints: Constraint[] = [];
  if (submittedValues.Type === "network") {
    return constraints;
  }

  constraints.push(...updateListener(resourceId, architecture, modifiedValues));

  constraints.push(
    ...updateListenerRules(
      resourceId,
      defaultValues,
      submittedValues,
      modifiedValues,
      architecture,
    ),
  );
  constraints.push(
    ...deleteRemovedRules(resourceId, defaultValues, modifiedValues),
  );
  return constraints;
}
