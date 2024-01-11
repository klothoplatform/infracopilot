import type {
  ListProperty} from "../../../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  type EnumProperty,
  PrimitiveTypes,
  type Property,
  type ResourceProperty,
  type ResourceType,
} from "../../../../shared/resources/ResourceTypes";

export const RoutesField: ListProperty = {
  name: "Routes",
  qualifiedName: "Routes",
  type: CollectionTypes.List,
  itemType: CollectionTypes.Map,
  configurationDisabled: false,
  deployTime: false,
  required: false,
  hidden: true,
  synthetic: true,
  properties: [
    {
      name: "Method",
      qualifiedName: "Routes.Method",
      type: PrimitiveTypes.Enum,
      required: true,
      defaultValue: "GET",
      allowedValues: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
        "ANY",
      ],
    } as EnumProperty,
    {
      name: "Path",
      qualifiedName: "Routes.Path",
      type: PrimitiveTypes.String,
      required: true,
      defaultValue: "/",
    } as Property,
    {
      name: "MethodResource",
      qualifiedName: "Routes.MethodResource",
      type: PrimitiveTypes.Resource,
      required: true,
      hidden: true,
    } as ResourceProperty,
    {
      name: "IntegrationResource",
      qualifiedName: "Routes.Integration",
      type: PrimitiveTypes.Resource,
      required: true,
      hidden: true,
    } as ResourceProperty,
  ],
};

export function restApiResourceTypeModifier(type: ResourceType) {
  type.properties?.push(RoutesField);
}
