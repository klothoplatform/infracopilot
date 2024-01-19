import { NodeId } from "./TopologyNode";
import TopologyEdge from "./TopologyEdge";

export enum ConstraintOperator {
  MustExist = "must_exist",
  MustNotExist = "must_not_exist",
  MustContain = "must_contain",
  MustNotContain = "must_not_contain",
  Add = "add",
  Import = "import",
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
  toFailureMessage: () => string;
}

export type ApplicationConstraintOperators = Extract<
  ConstraintOperator,
  | ConstraintOperator.Add
  | ConstraintOperator.Remove
  | ConstraintOperator.Replace
  | ConstraintOperator.Import
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
  ConstraintOperator.Equals | ConstraintOperator.Add
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
        return `Added ${this.node.toString()}`;
      case ConstraintOperator.Remove:
        return `Removed ${this.node.toString()}`;
      case ConstraintOperator.Replace:
        return `Replaced ${this.node.toString()} ➔ ${this.replacementNode?.toString()}`;
      case ConstraintOperator.Import:
        return `Imported ${this.node.toString()}`;
    }
  }

  toFailureMessage(): string {
    switch (this.operator) {
      case ConstraintOperator.Add:
        return `Failed to add ${this.node.toString()}`;
      case ConstraintOperator.Remove:
        return `Failed to remove ${this.node.toString()}`;
      case ConstraintOperator.Replace:
        return `Failed to replace ${this.node.toString()} ➔ ${this.replacementNode?.toString()}`;
      case ConstraintOperator.Import:
        return `Failed to import ${this.node.toString()}`;
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
    return `Expanded construct ${this.target.toString()}`;
  }

  toFailureMessage(): string {
    return `Failed to expand construct ${this.target.toString()}`;
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
    return `Configured ${this.target.toString()}`;
  }

  toFailureMessage(): string {
    return `Failed to configure ${this.target.toString()}`;
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
        return `Connected ${this.target.sourceId.name} ➔ ${this.target.targetId.name}`;
      case ConstraintOperator.MustNotExist:
        return `Disconnected ${this.target.sourceId.name} ➔ ${this.target.targetId.name}`;
      case ConstraintOperator.MustContain:
        return `Added ${this.node?.toString()} to ${
          this.target.sourceId.name
        } ➔ ${this.target.targetId.name}`;
      case ConstraintOperator.MustNotContain:
        return `Removed ${this.node?.toString()} from ${
          this.target.sourceId.name
        } ➔ ${this.target.targetId.name}`;
    }
  }

  toFailureMessage(): string {
    switch (this.operator) {
      case ConstraintOperator.MustExist:
        return `Failed to connect ${this.target.sourceId.name} ➔ ${this.target.targetId.name}`;
      case ConstraintOperator.MustNotExist:
        return `Failed to disconnect ${this.target.sourceId.name} ➔ ${this.target.targetId.name}`;
      case ConstraintOperator.MustContain:
        return `Failed to add ${this.node?.toString()} to ${
          this.target.sourceId.name
        } ➔ ${this.target.targetId.name}`;
      case ConstraintOperator.MustNotContain:
        return `Failed to remove ${this.node?.toString()} from ${
          this.target.sourceId.name
        } ➔ ${this.target.targetId.name}`;
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
            node: applicationConstraint.node.toString(),
            replacement_node: applicationConstraint.replacementNode?.toString(),
          };
        }
        case ConstraintScope.Construct:
          return {
            ...constraint,
            target: (constraint as ConstructConstraint).target.toString(),
          };
        case ConstraintScope.Resource:
          return {
            ...constraint,
            target: (constraint as ResourceConstraint).target.toString(),
          };
        case ConstraintScope.Edge:
          return {
            ...constraint,
            node: (constraint as EdgeConstraint).node?.toString(),
            target: {
              source: (constraint as EdgeConstraint).target.source,
              target: (constraint as EdgeConstraint).target.target,
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
          NodeId.parse(constraint.node),
          constraint.replacement_node
            ? NodeId.parse(constraint.replacement_node)
            : undefined,
        );
      case ConstraintScope.Construct:
        return new ConstructConstraint(
          constraint.operator,
          NodeId.parse(constraint.target),
          constraint.type,
          constraint.attributes,
        );
      case ConstraintScope.Resource:
        return new ResourceConstraint(
          constraint.operator,
          NodeId.parse(constraint.target),
          constraint.property,
          constraint.value,
        );
      case ConstraintScope.Edge:
        return new EdgeConstraint(
          constraint.operator,
          new TopologyEdge(
            NodeId.parse(constraint.target.source),
            NodeId.parse(constraint.target.target),
          ),
          constraint.node ? NodeId.parse(constraint.node) : undefined,
          constraint.attributes,
        );
      default:
        throw new Error(`Unknown constraint scope: ${constraint.scope}`);
    }
  });
}
