import type { Architecture } from "../../../../shared/architecture/Architecture";
import type { NodeId } from "../../../../shared/architecture/TopologyNode";
import { ApplicationError } from "../../../../shared/errors";

export function getDownstreamListener(
  architecture: Architecture,
  resourceId: NodeId,
) {
  const downstreamListeners = architecture.edges.filter(
    (e) =>
      e.source.equals(resourceId) &&
      e.destination.qualifiedType === "aws:load_balancer_listener",
  );
  if (downstreamListeners.length > 1) {
    throw new ApplicationError({
      message: "Application Load Balancer can only have one listener",
      errorId: "AlbFormStateBuilder:TooManyListeners",
    });
  }
  return downstreamListeners[0]?.destination;
}

export function getDownstreamListeners(
  architecture: Architecture,
  resourceId: NodeId,
) {
  return architecture.edges
    .filter(
      (e) =>
        e.source.equals(resourceId) &&
        e.destination.qualifiedType === "aws:load_balancer_listener",
    )
    .map((e) => e.destination);
}

export function getDownstreamListenerRules(
  listenerId: NodeId,
  architecture: Architecture,
) {
  const downstreamRules = listenerId
    ? architecture.edges
        .filter(
          (e) =>
            e.source.equals(listenerId) &&
            e.destination.qualifiedType === "aws:load_balancer_listener_rule",
        )
        .map((e) => e.destination)
    : [];

  const rules = downstreamRules
    .map((ruleId) => architecture.resources?.get(ruleId.toString()))
    .filter((r) => r?.Listener === listenerId.toString());
  return rules;
}
