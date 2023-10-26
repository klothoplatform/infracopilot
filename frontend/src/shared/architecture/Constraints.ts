import { NodeId } from "./TopologyNode";
import TopologyEdge from "./TopologyEdge";

export enum ConstraintOperator {
  MustExist = "must_exist",
  MustNotExist = "must_not_exist",
  MustContain = "must_contain",
  MustNotContain = "must_not_contain",
  Add = "add",
  Remove = "remove",
  Replace = "replace",
  Equals = "equals",
}

export enum ConstraintScope {
  Application = "application",
  Construct = "construct",
  Edge = "edge",
  Resource = "resource",
}

export interface Constraint {
  scope: ConstraintScope;
  operator: ConstraintOperator;
  toIntent: () => string;
  tofailureMessage: () => string;
}

export type ApplicationConstraintOperators = Extract<
  ConstraintOperator,
  | ConstraintOperator.Add
  | ConstraintOperator.Remove
  | ConstraintOperator.Replace
>;
export type ConstructConstraintOperators = Extract<
  ConstraintOperator,
  ConstraintOperator.Equals
>;
export type EdgeConstraintOperators = Extract<
  ConstraintOperator,
  | ConstraintOperator.MustExist
  | ConstraintOperator.MustNotExist
  | ConstraintOperator.MustContain
  | ConstraintOperator.MustNotContain
>;
export type ResourceConstraintOperators = Extract<
  ConstraintOperator,
  ConstraintOperator.Equals
>;

export class ApplicationConstraint implements Constraint {
  readonly scope: ConstraintScope.Application = ConstraintScope.Application;

  constructor(
    public operator: ApplicationConstraintOperators,
    public node: NodeId,
    public replacementNode?: NodeId,
  ) {}

  toIntent(): string {
    switch (this.operator) {
      case ConstraintOperator.Add:
        return `Added ${this.node.toKlothoIdString()}`;
      case ConstraintOperator.Remove:
        return `Removed ${this.node.toKlothoIdString()}`;
      case ConstraintOperator.Replace:
        return `Replaced ${this.node.toKlothoIdString()} -> ${this.replacementNode?.toKlothoIdString()}`;
    }
  }

  tofailureMessage(): string {
    switch (this.operator) {
      case ConstraintOperator.Add:
        return `Failed to add ${this.node.toKlothoIdString()}`;
      case ConstraintOperator.Remove:
        return `Failed to remove ${this.node.toKlothoIdString()}`;
      case ConstraintOperator.Replace:
        return `Failed to replace ${this.node.toKlothoIdString()} -> ${this.replacementNode?.toKlothoIdString()}`;
    }
  }
}

export class ConstructConstraint implements Constraint {
  readonly scope: ConstraintScope.Construct = ConstraintScope.Construct;

  constructor(
    public operator: ConstructConstraintOperators,
    public target: NodeId,
    public type: string,
    public attributes: object,
  ) {}

  toIntent(): string {
    return `Expanded construct ${this.target.toKlothoIdString()}`;
  }

  tofailureMessage(): string {
    return `Failed to expand construct ${this.target.toKlothoIdString()}`;
  }
}

export class ResourceConstraint implements Constraint {
  readonly scope: ConstraintScope.Resource = ConstraintScope.Resource;

  constructor(
    public operator: ResourceConstraintOperators,
    public target: NodeId,
    public property: string,
    public value: any,
  ) {}

  toIntent(): string {
    return `Configured ${this.target.toKlothoIdString()}`;
  }

  tofailureMessage(): string {
    return `Failed to configure ${this.target.toKlothoIdString()}`;
  }
}

export class EdgeConstraint implements Constraint {
  readonly scope: ConstraintScope.Edge = ConstraintScope.Edge;

  constructor(
    public operator: EdgeConstraintOperators,
    public target: TopologyEdge,
    public node?: NodeId,
    public attributes?: object,
  ) {}

  toIntent(): string {
    switch (this.operator) {
      case ConstraintOperator.MustExist:
        return `Connected ${this.target.sourceId.name} -> ${this.target.targetId.name}`;
      case ConstraintOperator.MustNotExist:
        return `Disconnected ${this.target.sourceId.name} -> ${this.target.targetId.name}`;
      case ConstraintOperator.MustContain:
        return `Added ${this.node?.toKlothoIdString()} to ${
          this.target.sourceId.name
        } -> ${this.target.targetId.name}`;
      case ConstraintOperator.MustNotContain:
        return `Removed ${this.node?.toKlothoIdString()} from ${
          this.target.sourceId.name
        } -> ${this.target.targetId.name}`;
    }
  }

  tofailureMessage(): string {
    switch (this.operator) {
      case ConstraintOperator.MustExist:
        return `Failed to connect ${this.target.sourceId.name} -> ${this.target.targetId.name}`;
      case ConstraintOperator.MustNotExist:
        return `Failed to disconnect ${this.target.sourceId.name} -> ${this.target.targetId.name}`;
      case ConstraintOperator.MustContain:
        return `Failed to add ${this.node?.toKlothoIdString()} to ${
          this.target.sourceId.name
        } -> ${this.target.targetId.name}`;
      case ConstraintOperator.MustNotContain:
        return `Failed to remove ${this.node?.toKlothoIdString()} from ${
          this.target.sourceId.name
        } -> ${this.target.targetId.name}`;
    }
  }
}

export function formatConstraints(constraints: Constraint[]): string {
  return JSON.stringify(
    constraints.map((constraint) => {
      switch (constraint.scope) {
        case ConstraintScope.Application: {
          const applicationConstraint = constraint as ApplicationConstraint;
          return {
            scope: applicationConstraint.scope,
            operator: applicationConstraint.operator,
            node: applicationConstraint.node.toKlothoIdString(),
            replacement_node:
              applicationConstraint.replacementNode?.toKlothoIdString(),
          };
        }
        case ConstraintScope.Construct:
          return {
            ...constraint,
            target: (
              constraint as ConstructConstraint
            ).target.toKlothoIdString(),
          };
        case ConstraintScope.Resource:
          return {
            ...constraint,
            target: (
              constraint as ResourceConstraint
            ).target.toKlothoIdString(),
          };
        case ConstraintScope.Edge:
          return {
            ...constraint,
            node: (constraint as EdgeConstraint).node?.toKlothoIdString(),
            target: {
              source: (
                constraint as EdgeConstraint
              ).target.sourceId.toKlothoIdString(),
              target: (
                constraint as EdgeConstraint
              ).target.targetId.toKlothoIdString(),
            },
          };
        default:
          throw new Error(`Unknown constraint scope: ${constraint.scope}`);
      }
    }),
  );
}

export function parseConstraints(constraints: any[]): Constraint[] {
  if (!constraints) {
    return [];
  }
  return constraints.map((constraint) => {
    switch (constraint.scope) {
      case ConstraintScope.Application:
        return new ApplicationConstraint(
          constraint.operator,
          NodeId.fromString(constraint.node),
          constraint.replacement_node
            ? NodeId.fromString(constraint.replacement_node)
            : undefined,
        );
      case ConstraintScope.Construct:
        return new ConstructConstraint(
          constraint.operator,
          NodeId.fromString(constraint.target),
          constraint.type,
          constraint.attributes,
        );
      case ConstraintScope.Resource:
        return new ResourceConstraint(
          constraint.operator,
          NodeId.fromString(constraint.target),
          constraint.property,
          constraint.value,
        );
      case ConstraintScope.Edge:
        return new EdgeConstraint(
          constraint.operator,
          new TopologyEdge(
            NodeId.fromString(constraint.target.source),
            NodeId.fromString(constraint.target.target),
          ),
          constraint.node ? NodeId.fromString(constraint.node) : undefined,
          constraint.attributes,
        );
      default:
        throw new Error(`Unknown constraint scope: ${constraint.scope}`);
    }
  });
}
