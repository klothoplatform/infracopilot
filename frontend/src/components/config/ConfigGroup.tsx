import type {
  MapProperty,
  Property,
} from "../../shared/resources/ResourceTypes";
import { CollectionTypes } from "../../shared/resources/ResourceTypes";
import type { FC, ReactNode } from "react";
import React from "react";
import { ConfigField } from "./ConfigField";
import type { NodeId } from "../../shared/architecture/TopologyNode";


type ConfigGroupProps = {
  configResource: NodeId;
  qualifiedFieldName?: string;
  valueSelector?: string;
  fields?: Property[];
  hidePrefix?: boolean;
};

export const ConfigGroup: FC<ConfigGroupProps> = ({
  configResource,
  qualifiedFieldName,
  valueSelector,
  fields,
  hidePrefix,
}) => {
  const rows: ReactNode[] = [];

  const parentLength = qualifiedFieldName?.split(".").length;
  // Make sure that all field names are fully qualified with the configResource prefix
  const prefix = qualifiedFieldName?.startsWith(`${configResource}#`) ? "" : `${configResource}#`;
  const addRow = (property: Property, resourceId?: NodeId) => {
    if (property.deployTime || property.configurationDisabled || property.hidden) {
      return
    }
    rows.push(
      <div key={rows.length} className="h-fit max-w-full p-1">
        <ConfigField
        // only show the resource if it isn't the one selected
          field={property}
          configResource={configResource}
          qualifiedFieldName={
            qualifiedFieldName
              ? `${prefix}${qualifiedFieldName}.${property.name}`
              : `${prefix}${property.qualifiedName}`
          }
          valueSelector={valueSelector}
          title={
            parentLength && hidePrefix
              ? qualifiedFieldName.split(".").slice(parentLength).join(".") +
                property.name
              : property.qualifiedName
          }
          required={property.required}
          readOnly={property.configurationDisabled}
        />
      </div>,
    );
  }

  fields
      ?.map((property) =>
        property.type === CollectionTypes.Map &&
        (property as MapProperty).valueType === CollectionTypes.Map
          ? property.properties?.map((child) => ({
              ...child,
              name: `${property.name}.${child.name}`,
            })) ?? property
          : property,
      )
      .flat()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((property: Property) => addRow(property, configResource));

  return <>{rows}</>;
};
