import type {
  MapProperty,
  Property,
} from "../../shared/resources/ResourceTypes";
import { CollectionTypes } from "../../shared/resources/ResourceTypes";
import type { FC, ReactNode } from "react";
import React from "react";
import { ConfigField } from "./ConfigField";

type ConfigGroupProps = {
  qualifiedFieldName?: string;
  valueSelector?: string;
  fields?: Property[];
  hidePrefix?: boolean;
};

const fieldDisplayFilter = (field: Property) =>
  !field.deployTime && !field.configurationDisabled;

export const ConfigGroup: FC<ConfigGroupProps> = ({
  qualifiedFieldName,
  valueSelector,
  fields,
  hidePrefix,
}) => {
  const rows: ReactNode[] = [];

  const parentLength = qualifiedFieldName?.split(".").length;
  fields
    ?.map((property) =>
      property.type === CollectionTypes.Map &&
      (property as MapProperty).valueType === CollectionTypes.Map
        ? property.properties ?? property
        : property,
    )
    .flat()
    ?.filter(fieldDisplayFilter)
    .forEach((property: Property, index: number) => {
      rows.push(
        <div key={index} className="h-fit max-w-full p-1">
          <ConfigField
            field={property}
            qualifiedFieldName={`${
              qualifiedFieldName ? qualifiedFieldName + "." : ""
            }${property.name}`}
            valueSelector={valueSelector}
            title={
              parentLength &&
              property.name !== property.qualifiedName &&
              hidePrefix
                ? property.qualifiedName
                    .split(".")
                    .slice(parentLength)
                    .join(".")
                : property.qualifiedName
            }
            required={property.required}
            readOnly={property.configurationDisabled}
          />
        </div>,
      );
    });

  return <>{rows}</>;
};
