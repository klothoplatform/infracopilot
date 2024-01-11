import { ConfigSection } from "../../../../components/config/ConfigSection";
import { ListField } from "../../../../components/config/ListField";
import type {
  EnumProperty,
  ListProperty,
  Property,
  ResourceProperty,
  ResourceType,
} from "../../../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  PrimitiveTypes,
} from "../../../../shared/resources/ResourceTypes";
import type { NodeId } from "../../../../shared/architecture/TopologyNode";
import type { FC } from "react";
import React from "react";

const RoutesField: ListProperty = {
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

export const RestApiRouteConfig: FC<{ configResource: NodeId }> = ({
  configResource,
}) => (
  <ConfigSection id="Routes" title="Routes">
    <ListField
      configResource={configResource}
      qualifiedFieldName={`${configResource}#Routes`}
      field={RoutesField}
    />
  </ConfigSection>
);
