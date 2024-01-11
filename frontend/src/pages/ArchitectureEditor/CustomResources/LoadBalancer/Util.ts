import { type EnvironmentVersion } from "../../../../shared/architecture/EnvironmentVersion";
import type { NodeId } from "../../../../shared/architecture/TopologyNode";
import { ApplicationError } from "../../../../shared/errors";

export function getDownstreamListener(
  environmentVersion: EnvironmentVersion,
  resourceId: NodeId,
) {
  const downstreamListeners = environmentVersion.edges.filter(
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
  environmentVersion: EnvironmentVersion,
  resourceId: NodeId,
) {
  return environmentVersion.edges
    .filter(
      (e) =>
        e.source.equals(resourceId) &&
        e.destination.qualifiedType === "aws:load_balancer_listener",
    )
    .map((e) => e.destination);
}

export function getDownstreamListenerRules(
  listenerId: NodeId,
  environmentVersion: EnvironmentVersion,
) {
  const downstreamRules = listenerId
    ? environmentVersion.edges
        .filter(
          (e) =>
            e.source.equals(listenerId) &&
            e.destination.qualifiedType === "aws:load_balancer_listener_rule",
        )
        .map((e) => e.destination)
    : [];

  const rules = downstreamRules
    .map((ruleId) => environmentVersion.resources?.get(ruleId.toString()))
    .filter((r) => r?.Listener === listenerId.toString());
  return rules;
}
