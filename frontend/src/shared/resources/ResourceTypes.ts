import type {
  ArchitectureView,
  ViewNodeType,
} from "../architecture/Architecture";

export interface ResourceType {
  provider: string;
  type: string;
  classifications?: string[];
  displayName: string;
  properties?: Property[];
  views: Map<ArchitectureView, ViewNodeType>;
}

export interface Property {
  configurationDisabled?: boolean;
  deployTime?: boolean;
  name: string;
  description?: string;
  properties?: Property[];
  qualifiedName: string;
  required?: boolean;
  defaultValue?: any;
  type: PropertyType;
  // UI flag for hiding a property from the UI (e.g. when it is handled by a custom config section)
  hidden?: boolean;
  // UI flag for indicating that a property is not part of the resource definition (e.g. when it is handled by a custom config section)
  // and should be ignored when serializing configuration form data
  synthetic?: boolean;
  // Whether the property is "important". There are many reasons why a property might be important, but the effect is that it should
  // be highlighted in the UI.
  important?: boolean;
  omitIfConditions?: ResourcePredicate[];
  uniqueValue?: boolean;
}

export type ResourcePredicate = (resource: any) => boolean;

export function shouldOmitProperty(property: Property, resource: any): boolean {
  return (
    property.deployTime ||
    property.hidden ||
    (property.omitIfConditions?.some((condition) => condition(resource)) ??
      false)
  );
}

export interface ListProperty extends Property {
  allowedValues?: string[];
  itemType: PropertyType;
  properties?: Property[];
  minLength?: number;
  maxLength?: number;
  uniqueItems?: boolean;
}

export interface ResourceListProperty extends ListProperty {
  resourceTypes?: string[];
}

export interface SetProperty extends ListProperty {}

export interface ResourceSetProperty extends SetProperty {
  resourceTypes?: string[];
}

export interface MapProperty extends Property {
  keyType: PropertyType;
  valueType: PropertyType;
  properties?: Property[];
  uniqueKeys?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface ResourceProperty extends Property {
  resourceTypes?: string[];
}

export interface StringProperty extends Property {
  minLength?: number;
  maxLength?: number;
}

export interface EnumProperty extends Property {
  allowedValues?: string[];
}

export interface NumberProperty extends Property {
  minValue?: number;
  maxValue?: number;
}

export enum PrimitiveTypes {
  Boolean = "boolean",
  Enum = "enum",
  Integer = "integer",
  Number = "number",
  Resource = "resource",
  String = "string",
}

export enum CollectionTypes {
  List = "list",
  Map = "map",
  Set = "set",
}

export type PropertyType = PrimitiveTypes | CollectionTypes;

export function isPrimitive(value: string): value is PrimitiveTypes {
  return Object.values<string>(PrimitiveTypes).includes(value);
}

export function isCollection(value: string): value is CollectionTypes {
  return Object.values<string>(CollectionTypes).includes(value);
}

export interface ResourceTypeFilter {
  providers?: string[];
  types?: string[];
  classifications?: string[];
  excludedProviders?: string[];
  excludedTypes?: string[];
  excludedClassifications?: string[];
  excludedQualifiedTypes?: string[];
  iconSizes?: ViewNodeType[];
}

type RawProperty = {
  name: string;
  type: string;
  description?: string;
  configurationDisabled: boolean;
  deployTime: boolean;
  properties: object;
  required?: boolean;
  defaultValue?: any;
  allowedValues?: string[];
  minValue?: number;
  maxValue?: number;
  important?: boolean;
  minLength?: number;
  maxLength?: number;
  uniqueItems?: boolean;
  uniqueKeys?: boolean;
};

function toList(rawProperties: any): RawProperty[] {
  return rawProperties
    ? Object.keys(rawProperties).map((key) => {
        const property = rawProperties[key];
        return {
          ...property,
          name: key,
          properties: property.properties,
        };
      })
    : [];
}

export function parseProperties(
  rawProperties: any,
  parentQualifiedName?: string,
): Property[] {
  const rawPropertiesList: RawProperty[] = toList(rawProperties);

  const properties: Property[] = [];
  if (!rawPropertiesList?.length) {
    return properties;
  }

  for (const rawProperty of rawPropertiesList) {
    const property = parseProperty(rawProperty, parentQualifiedName);
    properties.push(property);
  }
  return properties.sort((a, b) => a.name.localeCompare(b.name));
}

function extractInnerTypes(rawType: string): string[] {
  const index = rawType.indexOf("(") + 1;
  return index < 1
    ? []
    : [rawType.substring(index, rawType?.length - 1).trim()];
}

export function parseProperty(
  rawProperty: RawProperty,
  parentQualifiedName?: string,
): Property {
  const {
    name,
    type: rawType,
    description,
    configurationDisabled,
    deployTime,
    allowedValues,
    properties: children,
    required,
    defaultValue,
    minValue,
    maxValue,
    important,
    minLength,
    maxLength,
    uniqueItems,
    uniqueKeys,
  }: RawProperty = rawProperty as any;

  if (!name) {
    console.warn("Property missing name", rawProperty);
  }

  const type = parseType(rawType);
  const qualifiedName = `${
    parentQualifiedName ? parentQualifiedName + "." : ""
  }${name}`;

  const property: Property = {
    name,
    qualifiedName,
    type,
    description,
    configurationDisabled,
    deployTime,
    required,
    defaultValue,
    important,
  };

  switch (type) {
    case CollectionTypes.List: {
      const rawItemType = extractInnerTypes(rawType)[0] ?? "map";
      const itemType = parseType(rawItemType);
      const listProperty = property as ListProperty;
      listProperty.itemType = itemType;
      if (isCollection(itemType)) {
        listProperty.properties = parseProperties(children, qualifiedName);
      }
      if (itemType === PrimitiveTypes.Resource) {
        (listProperty as ResourceListProperty).resourceTypes =
          extractInnerTypes(rawItemType);
      }
      listProperty.allowedValues = allowedValues;
      listProperty.minLength = minLength;
      listProperty.maxLength = maxLength;
      listProperty.uniqueItems = uniqueItems;
      break;
    }
    case CollectionTypes.Set: {
      const itemType = parseType(rawType?.replace("set(", "").replace(")", ""));
      const setProperty = property as SetProperty;
      setProperty.itemType = itemType;
      if (isCollection(itemType)) {
        setProperty.properties = parseProperties(children, qualifiedName);
      }
      setProperty.allowedValues = allowedValues;
      setProperty.minLength = minLength;
      setProperty.maxLength = maxLength;
      setProperty.uniqueItems = uniqueItems;
      break;
    }
    case CollectionTypes.Map: {
      const keyType =
        rawType === "map"
          ? PrimitiveTypes.String
          : parseType(
              rawType?.replace("map(", "").replace(")", "").split(",")[0],
            );
      const valueType =
        rawType === "map"
          ? CollectionTypes.Map
          : parseType(
              rawType?.replace("map(", "").replace(")", "").split(",")[1],
            );
      const mapProperty = property as MapProperty;
      mapProperty.keyType = keyType;
      mapProperty.valueType = valueType;
      mapProperty.uniqueKeys = uniqueKeys !== false;
      mapProperty.minLength = minLength;
      mapProperty.maxLength = maxLength;

      if (isCollection(valueType)) {
        mapProperty.properties = parseProperties(children, qualifiedName);
      }
      break;
    }
    case PrimitiveTypes.Resource: {
      const resourceProperty = property as ResourceProperty;
      resourceProperty.resourceTypes = extractInnerTypes(rawType);
      break;
    }
    case PrimitiveTypes.String: {
      if (allowedValues) {
        const enumProperty = property as EnumProperty;
        enumProperty.type = PrimitiveTypes.Enum;
        enumProperty.allowedValues = allowedValues;
        break;
      }
      const stringProperty = property as StringProperty;
      stringProperty.minLength = minLength;
      stringProperty.maxLength = maxLength;
      break;
    }
    case PrimitiveTypes.Integer:
    case PrimitiveTypes.Number: {
      const numberProperty = property as NumberProperty;
      numberProperty.minValue = minValue;
      numberProperty.maxValue = maxValue;
      break;
    }
  }
  return property;
}

export function parseType(rawType?: string): PropertyType {
  if (!rawType) {
    return PrimitiveTypes.String;
  }
  // TODO: add better handling for any as json
  if (rawType === "string" || rawType === "str" || rawType === "any") {
    return PrimitiveTypes.String;
  } else if (rawType === "number") {
    return PrimitiveTypes.Number;
  } else if (rawType === "int" || rawType === "integer") {
    return PrimitiveTypes.Integer;
  } else if (rawType === "bool" || rawType === "boolean") {
    return PrimitiveTypes.Boolean;
  } else if (rawType.startsWith("list(") || rawType === "list") {
    return CollectionTypes.List;
  } else if (rawType.startsWith("set(") || rawType === "set") {
    return CollectionTypes.Set;
  } else if (rawType.startsWith("map(") || rawType === "map") {
    return CollectionTypes.Map;
  } else if (rawType.startsWith("resource(") || rawType === "resource") {
    return PrimitiveTypes.Resource;
  }
  throw new Error(`Unknown property type: ${rawType}`);
}

export function deriveDisplayName(type: string): string {
  return type
    .split("_")
    .map(
      ([firstChar, ...rest]) =>
        firstChar.toUpperCase() + rest.join("").toLowerCase(),
    )
    .join(" ");
}

export function getNewValue(properties: Property[] | undefined): object {
  const val: any = {};
  for (const property of properties ?? []) {
    switch (property.type) {
      case PrimitiveTypes.Number:
        val[property.name] = 0;
        break;
      case PrimitiveTypes.Boolean:
        val[property.name] = false;
        break;
      case CollectionTypes.List:
      case CollectionTypes.Set:
      case CollectionTypes.Map:
        val[property.name] = [];
        break;
      default:
        val[property.name] = "";
    }
  }
  return val;
}
