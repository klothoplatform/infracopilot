import type {
  MapProperty,
  Property,
} from "../../shared/resources/ResourceTypes";
import { CollectionTypes } from "../../shared/resources/ResourceTypes";
import type { FC, ReactNode } from "react";
import React from "react";
import { ConfigField } from "./ConfigField";
import { useFormState } from "react-hook-form";
import useApplicationStore from "../../pages/store/ApplicationStore";
import type { NodeId } from "../../shared/architecture/TopologyNode";


type ConfigGroupProps = {
  selectedResource?: NodeId;
  qualifiedFieldName?: string;
  valueSelector?: string;
  fields?: Map<NodeId, Property[]> | Property[];
  hidePrefix?: boolean;
};

export const ConfigGroup: FC<ConfigGroupProps> = ({
  selectedResource,
  qualifiedFieldName,
  valueSelector,
  fields,
  hidePrefix,
}) => {
  const rows: ReactNode[] = [];

  const parentLength = qualifiedFieldName?.split(".").length;
  const addRow = (property: Property, resourceId?: NodeId) => {
    rows.push(
      <div key={rows.length} className="h-fit max-w-full p-1">
        <ConfigField
        // only show the resource if it isn't the one selected
        displayedResource={resourceId === selectedResource ? undefined : resourceId}
          field={property}
          qualifiedFieldName={
            qualifiedFieldName
              ? `${qualifiedFieldName}.${property.name}`
              : property.qualifiedName
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
  const addProperties = (properties: Property[], resourceId?: NodeId) => {
    properties
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
      .forEach((property: Property, index: number) => {
        addRow(property, resourceId);
      });
  };


  if (fields instanceof Map) {
    for (const [resourceId, properties] of fields ?? []) {
      addProperties(properties, resourceId);
    }
  } else {
    addProperties(fields ?? []);
  }



  return <>{rows}</>;
};
