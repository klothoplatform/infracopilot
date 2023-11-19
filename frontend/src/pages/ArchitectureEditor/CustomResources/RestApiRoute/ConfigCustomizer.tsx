import type { FC } from "react";
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

export function restApiIntegrationResourceCustomizer(type: ResourceType) {
  type.properties?.push(RoutesField);
}
export const RestApiRouteConfig: FC = (props) => {
  return (
    <ConfigSection id="Routes" title="Routes">
      <ListField qualifiedFieldName="Routes" field={RoutesField} />
    </ConfigSection>
  );
};
