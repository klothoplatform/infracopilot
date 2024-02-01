import type { Node } from "reactflow";
import type { Constraint } from "../../../../shared/architecture/Constraints";
import {
  ApplicationConstraint,
  ConstraintOperator,
  EdgeConstraint,
  ResourceConstraint,
} from "../../../../shared/architecture/Constraints";
import { NodeId } from "../../../../shared/architecture/TopologyNode";
import TopologyEdge from "../../../../shared/architecture/TopologyEdge";
import {
  getDownstreamListener,
  getDownstreamListenerRules,
  getDownstreamListeners,
} from "./Util";
import { findChildProperty } from "../../../../components/config/ConfigField";
import { type EnvironmentVersion } from "../../../../shared/architecture/EnvironmentVersion";

export function loadBalancerCreationConstraintsModifier(
  node: Node,
  environmentVersion: EnvironmentVersion,
  defaultConstraints: Constraint[],
) {
  const albId = node.data.resourceId;

  const albConstraints = [
    new ResourceConstraint(
      ConstraintOperator.Equals,
      albId,
      "Type",
      "application",
    ),
    ...addAlbListener(albId, environmentVersion).constraints,
  ];

  return [...defaultConstraints, ...albConstraints];
}

export function addAlbListener(
  albId: NodeId,
  environmentVersion: EnvironmentVersion,
): { listenerId: NodeId; constraints: Constraint[] } {
  const listenerId = new NodeId(
    "load_balancer_listener",
    albId.name,
    `${albId.name}-listener-0`,
    "aws",
  );
  let i = 0;
  while (environmentVersion.resources?.has(listenerId.toString())) {
    listenerId.name = `${albId.name}-listener-${++i}`;
  }
  const rule = new NodeId(
    "load_balancer_listener_rule",
    listenerId.name,
    `default-rule`,
    "aws",
  );
  return {
    listenerId,
    constraints: [
      new ApplicationConstraint(ConstraintOperator.Add, listenerId),
      new EdgeConstraint(
        ConstraintOperator.MustExist,
        new TopologyEdge(albId, listenerId),
      ),
      new ResourceConstraint(
        ConstraintOperator.Equals,
        listenerId,
        "Protocol",
        "HTTP",
      ),
      new ResourceConstraint(
        ConstraintOperator.Equals,
        listenerId,
        "Port",
        "80",
      ),
      new ApplicationConstraint(ConstraintOperator.Add, rule),
      new EdgeConstraint(
        ConstraintOperator.MustExist,
        new TopologyEdge(listenerId, rule),
      ),
      new ResourceConstraint(ConstraintOperator.Equals, rule, "Tags", {
        Name: "default-rule",
      }),
      new ResourceConstraint(ConstraintOperator.Equals, rule, "Conditions", [
        {
          PathPattern: {
            Values: ["/*"],
          },
        },
      ]),
    ],
  };
}

export function removeExistingListeners(
  environmentVersion: EnvironmentVersion,
  albId: NodeId,
): Constraint[] {
  const existingListeners = getDownstreamListeners(environmentVersion, albId);
  const constraints = existingListeners.map((listenerId) => {
    const existingRules = getDownstreamListenerRules(
      listenerId,
      environmentVersion,
    );
    const ruleConstraints = existingRules.map((rule) => {
      return new ApplicationConstraint(ConstraintOperator.Remove, rule.id);
    });
    ruleConstraints.push(
      new ApplicationConstraint(ConstraintOperator.Remove, listenerId),
    );
    return ruleConstraints;
  });
  return constraints.flat();
}

export function convertAlbToNlb(
  albId: NodeId,
  environmentVersion: EnvironmentVersion,
): Constraint[] {
  return [
    new ResourceConstraint(ConstraintOperator.Equals, albId, "Type", "network"),
    ...removeExistingListeners(environmentVersion, albId),
  ];
}

export function convertNlbToAlb(
  albId: NodeId,
  environmentVersion: EnvironmentVersion,
): Constraint[] {
  const { constraints: newAlbListenerConstraints } = addAlbListener(
    albId,
    environmentVersion,
  );
  const removeExistingListenerConstraints = removeExistingListeners(
    environmentVersion,
    albId,
  );

  return [
    new ResourceConstraint(
      ConstraintOperator.Equals,
      albId,
      "Type",
      "application",
    ),
    ...removeExistingListenerConstraints,
    ...newAlbListenerConstraints,
  ];
}

export function deleteRemovedRules(
  loadBalancerId: NodeId,
  defaultValues: any,
  modifiedValues: Map<string, any>,
): Constraint[] {
  const deletionConstraints: Constraint[] = [];
  modifiedValues.forEach((v, k) => {
    if (/^Listener.Rules\[\d+]$/.test(k) && v === undefined) {
      const ruleId = findChildProperty(
        defaultValues,
        `${loadBalancerId}#${k}`,
      )?.id;
      if (!ruleId) {
        return;
      }
      deletionConstraints.push(
        new ApplicationConstraint(ConstraintOperator.Remove, ruleId),
      );
    }
  });
  return deletionConstraints;
}

export function updateListenerRules(
  loadBalancerId: NodeId,
  defaultValues: any,
  submittedValues: any,
  modifiedValues: Map<string, any>,
  environmentVersion: EnvironmentVersion,
): Constraint[] {
  const submittedRules = findChildProperty(
    submittedValues,
    `${loadBalancerId}#Listener.Rules`,
  );

  return (
    submittedRules
      ?.map((submittedRule: any, i: number) => {
        if (
          submittedRule.PathPattern?.length ===
            findChildProperty(
              defaultValues,
              `${loadBalancerId}#Listener.Rules[${i}].PathPattern`,
            )?.length &&
          submittedRule.HttpRequestMethod?.length ===
            findChildProperty(
              defaultValues,
              `${loadBalancerId}#Listener.Rules[${i}].HttpRequestMethod`,
            )?.length &&
          ![...modifiedValues.keys()].find((k) =>
            k.startsWith(`Listener.Rules[${i}]`),
          )
        ) {
          console.log("no modified values for rule", submittedRule.id);
          return [];
        }

        const ruleConstraints = [];

        let ruleId = submittedRule.id;
        const existingRule = ruleId
          ? environmentVersion.resources?.get(ruleId.toString())
          : undefined;

        // add new Rule if it doesn't exist
        if (!existingRule) {
          const listenerId = getDownstreamListener(
            environmentVersion,
            loadBalancerId,
          );

          ruleId = new NodeId(
            "load_balancer_listener_rule",
            listenerId.name,
            `rule-${i}`,
            "aws",
          );
          let j = i;
          while (environmentVersion.resources?.has(ruleId.toString())) {
            ruleId = new NodeId(
              "load_balancer_listener_rule",
              listenerId.name,
              `rule-${++j}`,
              "aws",
            );
          }

          ruleConstraints.push(
            new ApplicationConstraint(ConstraintOperator.Add, ruleId),
            new EdgeConstraint(
              ConstraintOperator.MustExist,
              new TopologyEdge(listenerId, ruleId),
            ),
          );
        }

        const updatedConditions = [...(existingRule?.Conditions ?? [])];
        const conditionsToRemove: number[] = [];
        let existingPathPatternConditionIndex = -1;
        let existingMethodConditionIndex = -1;
        if (existingRule) {
          existingPathPatternConditionIndex =
            existingRule.Conditions?.findIndex(
              (c: any) => c.PathPattern?.Values?.length,
            );
          existingMethodConditionIndex = existingRule.Conditions?.findIndex(
            (c: any) => c.HttpRequestMethod?.Values?.length,
          );
        }
        // add or replace path-pattern condition
        if (submittedRule.PathPattern?.length) {
          const pathPatternCondition = {
            PathPattern: {
              Values: submittedRule.PathPattern.map((p: any) => p.value),
            },
          };
          if (existingPathPatternConditionIndex >= 0) {
            updatedConditions[existingPathPatternConditionIndex] =
              pathPatternCondition;
          } else {
            updatedConditions.push(pathPatternCondition);
          }
        } else if (existingPathPatternConditionIndex >= 0) {
          // mark path-pattern condition for removal
          conditionsToRemove.push(existingPathPatternConditionIndex);
        }

        // add or replace http-request-method condition
        if (submittedRule.HttpRequestMethod?.length) {
          const methodCondition = {
            HttpRequestMethod: {
              Values: submittedRule.HttpRequestMethod.map((m: any) => m.value),
            },
          };
          if (existingMethodConditionIndex >= 0) {
            updatedConditions[existingMethodConditionIndex] = methodCondition;
          } else {
            updatedConditions.push(methodCondition);
          }
        } else if (existingMethodConditionIndex >= 0) {
          // mark http-request-method condition for removal
          conditionsToRemove.push(existingMethodConditionIndex);
        }

        // remove conditions marked for removal (in reverse order to avoid index shifting)
        conditionsToRemove
          .sort((a, b) => b - a)
          .forEach((i) => updatedConditions.splice(i, 1));
        // update conditions
        ruleConstraints.push(
          new ResourceConstraint(
            ConstraintOperator.Equals,
            ruleId,
            "Conditions",
            updatedConditions,
          ),
        );

        // update priority based on previous rule (or 1 if first rule)
        const priority = (
          (i === 0
            ? 0
            : environmentVersion.resources.get(
                submittedRules[i - 1].id?.toString(),
              )?.Priority ?? i) + 1
        ).toString();
        if (!existingRule?.Priority || priority !== existingRule.Priority) {
          ruleConstraints.push(
            new ResourceConstraint(
              ConstraintOperator.Equals,
              ruleId,
              "Priority",
              priority,
            ),
          );
        }
        return ruleConstraints;
      })
      .flat() ?? []
  );
}

export function updateListener(
  resourceId: NodeId,
  environmentVersion: EnvironmentVersion,
  modifiedValues: Map<string, any>,
): Constraint[] {
  let listenerConstraints: Constraint[] = [];
  let listenerId = getDownstreamListener(environmentVersion, resourceId);
  const existingListener = listenerId
    ? environmentVersion.resources?.get(listenerId.toString())
    : undefined;
  if (!existingListener) {
    const listener = addAlbListener(resourceId, environmentVersion);
    listenerId = listener.listenerId;
    listenerConstraints = listener.constraints;
  }

  if (modifiedValues.has("Listener.Protocol")) {
    listenerConstraints.push(
      new ResourceConstraint(
        ConstraintOperator.Equals,
        listenerId,
        "Protocol",
        modifiedValues.get("Listener.Protocol"),
      ),
    );
  }
  if (modifiedValues.has("Listener.Port")) {
    listenerConstraints.push(
      new ResourceConstraint(
        ConstraintOperator.Equals,
        listenerId,
        "Port",
        modifiedValues.get("Listener.Port"),
      ),
    );
  }
  return listenerConstraints;
}
