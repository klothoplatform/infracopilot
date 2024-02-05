import { NodeId } from "./TopologyNode";
import TopologyEdge from "./TopologyEdge";
import {
  CollectionTypes,
  type Property,
  type ResourceType,
} from "../resources/ResourceTypes";

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

export function removeEmptyKeys(input: any, isTopLevel: boolean = true): any {
  if (typeof input === "object" && input !== null) {
    // If the input is an array then we just want to recurse into the items in the array since we wont modify the length of the array, etc
    if (Array.isArray(input)) {
      return input.map((item) => removeEmptyKeys(item, false));
    } else {
      let output = { ...input };

      let keys = Object.keys(output);
      // we want to provide a way for someone to unset a string,
      // so if the only thing being passed in is a single key that has a string value then we will allow it.
      // Otherwise if theres multiple keys or you are a nested config we wont allow it
      if (keys.length > 1 || !isTopLevel) {
        for (let key of keys) {
          if (output[key] === "") {
            delete output[key];
          }
        }
      }

      for (let key of keys) {
        // If the value is an object, process it recursively
        if (typeof output[key] === "object") {
          output[key] = removeEmptyKeys(output[key], false);
        }
      }

      return output;
    }
  }

  return input;
}

export function generateConstraintMetadataFromFormState(
  resourceMetadata: any,
  state: any,
  resourceType: ResourceType,
): any {
  const constraintMetadata: { [path: string]: any } = {};
  Object.entries(state).forEach(([key, value]) => {
    const pathstr = key.split("#")[1];
    const propertyPath: string[] = pathstr.split(".");
    let currentProperty: Property;
    let path: string[] = [];

    let stopPathExecution = false;
    propertyPath.forEach((prop) => {
      const name = prop.split("[")[0];
      if (stopPathExecution) {
        return;
      }
      // ensure we understand the current path string is representing and set as the current property
      // we ensure if the property is a list we look to see if the list exists to understand if the path in the metadata should include an index
      if (currentProperty === undefined) {
        resourceType!.properties?.forEach((field) => {
          if (field.name === name) {
            currentProperty = field;
            if (
              field.type === CollectionTypes.List ||
              field.type === CollectionTypes.Set
            ) {
              const val = resourceMetadata[name];
              if (val) {
                path.push(prop);
                return;
              }
            }
            path.push(prop.split("[")[0]);
          }
        });
      } else {
        currentProperty.properties?.forEach((field) => {
          if (field.name === name) {
            currentProperty = field;
            if (
              field.type === CollectionTypes.List ||
              field.type === CollectionTypes.Set
            ) {
              const val = getDataFromPath(path.join("."), resourceMetadata);
              if (val) {
                path.push(prop);
                return;
              }
            }
            path.push(prop.split("[")[0]);
          }
        });
      }

      // if there is a synthetic property found we just set the constraint metadata to the value
      // this is for the case of customized configuration
      if (currentProperty.synthetic) {
        constraintMetadata[path.join(".")] = value;
        return;
      }

      // if there are no sub properties then we know we have to set the constraint metadata rather than looping deeper into the proeprties
      if (currentProperty?.properties === undefined) {
        switch (currentProperty?.type) {
          case CollectionTypes.Map: {
            const mapVal = value as {
              key: any;
              value: any;
            };
            const val = getDataFromPath(path.join("."), resourceMetadata);
            const currVal = constraintMetadata[path.join(".")];
            const newVal = {
              ...val,
              ...currVal,
              [mapVal.key]: mapVal.value,
            };
            constraintMetadata[path.join(".")] = newVal;
            break;
          }
          case CollectionTypes.Set:
          case CollectionTypes.List: {
            const val = getDataFromPath(path.join("."), resourceMetadata);
            if (!val) {
              constraintMetadata[path.join(".")] = [value];
            } else {
              val.push(value);
              constraintMetadata[path.join(".")] = val;
            }
            break;
          }
          default:
            constraintMetadata[key] = value;
        }
      } else {
        // If there are sub properties we just need to ensure that we are not at an empty list or a non existent list object
        // if we are then we need to ensure we create the nested values and are setting the overall list in the constraint metadata so we can use an equals constraint
        const val = getDataFromPath(path.join("."), resourceMetadata);
        switch (currentProperty?.type) {
          case CollectionTypes.Set:
          case CollectionTypes.List: {
            if (!val) {
              const nonIndexPath = path.join(".").split("[")[0];
              const currVal = getDataFromPath(nonIndexPath, resourceMetadata);
              if (currVal && constraintMetadata[nonIndexPath] === undefined) {
                constraintMetadata[nonIndexPath] = currVal;
              }
              setNestedValue(
                constraintMetadata[nonIndexPath],
                pathstr.substring(nonIndexPath.length),
                value,
              );
              stopPathExecution = true;
            }
          }
        }
      }
    });
  });
  return constraintMetadata;
}

const getDataFromPath = (path: string, resourceMetadata: any) => {
  const properties: string[] = path.split(".");
  // deep copy so that resource metadata doesnt get modified in parent functions
  let currentData = JSON.parse(JSON.stringify(resourceMetadata));
  properties.forEach((prop) => {
    const splitProp = prop.split("[");
    currentData = currentData[splitProp[0]];
    if (currentData === undefined) {
      return undefined;
    }
    if (splitProp.length > 1) {
      const index = parseInt(splitProp[1].split("]")[0]);
      currentData = currentData[index];
    }
  });
  return currentData;
};

export function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const isArrayIndex = key.endsWith("]");
    const arrayKey = isArrayIndex ? key.slice(0, key.indexOf("[")) : key;
    const arrayIndex = isArrayIndex
      ? parseInt(key.slice(key.indexOf("[") + 1, -1))
      : -1;

    if (i === keys.length - 1) {
      // If this is the last key, set the value
      if (isArrayIndex) {
        current[arrayKey][arrayIndex] = value;
      } else {
        current[key] = value;
      }
    } else {
      if (isArrayIndex) {
        if (i === 0) {
          // If the path starts with an array index
          if (current[arrayIndex] === undefined) {
            current[arrayIndex] = {};
          }
          current = current[arrayIndex];
        } else {
          // If the key is an array index, make sure the array exists and has the necessary length
          if (!Array.isArray(current[arrayKey])) {
            current[arrayKey] = [];
          }
          if (current[arrayKey][arrayIndex] === undefined) {
            current[arrayKey][arrayIndex] = {};
          }
          current = current[arrayKey][arrayIndex];
        }
      } else {
        // If the key is not an array index, make sure the object exists
        if (current[key] === undefined) {
          current[key] = {};
        }
        current = current[key];
      }
    }
  }
}
