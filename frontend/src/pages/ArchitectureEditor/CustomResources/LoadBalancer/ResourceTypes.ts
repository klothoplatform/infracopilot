import type {
  ListProperty,
  MapProperty,
  NumberProperty,
} from "../../../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  type EnumProperty,
  PrimitiveTypes,
  type Property,
  type ResourceType,
} from "../../../../shared/resources/ResourceTypes";

const typeIsNotApplication = (resource: any) => resource.Type !== "application";
export const RulesField: ListProperty = {
  name: "Rules",
  qualifiedName: "Listener.Rules",
  type: CollectionTypes.List,
  itemType: CollectionTypes.Map,
  synthetic: true,
  properties: [
    {
      name: "HttpRequestMethod",
      qualifiedName: "Rules.HttpRequestMethod",
      type: CollectionTypes.List,
      itemType: PrimitiveTypes.Enum,
      defaultValue: ["GET"],
      allowedValues: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
      ],
    } as ListProperty,
    {
      name: "PathPattern",
      qualifiedName: "Rules.PathPattern",
      type: CollectionTypes.List,
      itemType: PrimitiveTypes.String,
      defaultValue: ["/"],
    } as ListProperty,
  ],
};
export const ProtocolField: EnumProperty = {
  name: "Protocol",
  qualifiedName: "Listener.Protocol",
  type: PrimitiveTypes.Enum,
  defaultValue: "HTTP",
  allowedValues: ["HTTP", "HTTPS"],
  synthetic: true,
};
export const PortField: NumberProperty = {
  name: "Port",
  qualifiedName: "Listener.Port",
  type: PrimitiveTypes.Integer,
  synthetic: true,
  defaultValue: 80,
  minValue: 1,
  maxValue: 65535,
};

export const ListenerField: MapProperty = {
  name: "Listener",
  qualifiedName: "Listener",
  type: CollectionTypes.Map,
  hidden: true,
  synthetic: true,
  omitIfConditions: [typeIsNotApplication],
  keyType: PrimitiveTypes.String,
  valueType: CollectionTypes.Map,
  properties: [RulesField, ProtocolField, PortField],
};

export function loadBalancerResourceTypeModifier(type: ResourceType) {
  type.properties?.push(ListenerField);
}
