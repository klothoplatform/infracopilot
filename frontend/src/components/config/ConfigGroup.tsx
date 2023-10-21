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
  fields?: Property[];
  hidePrefix?: boolean;
};

export const ConfigGroup: FC<ConfigGroupProps> = ({
  qualifiedFieldName,
  fields,
  hidePrefix,
}) => {
  const rows: ReactNode[] = [];

  const parentLength = qualifiedFieldName?.substring(
    0,
    qualifiedFieldName?.lastIndexOf("["),
  ).length;
  fields
    ?.map((property) =>
      property.type === CollectionTypes.Map &&
      (property as MapProperty).valueType === CollectionTypes.Map
        ? property.properties ?? property
        : property,
    )
    .flat()
    .filter((property) => !property.deployTime)
    .forEach((property: Property, index: number) => {
      rows.push(
        <div key={index} className="h-fit max-w-full px-2">
          <ConfigField
            field={property}
            id={
              qualifiedFieldName?.includes("[")
                ? `${qualifiedFieldName}.${property.name}`
                : property.qualifiedName
            }
            title={
              parentLength &&
              property.name !== property.qualifiedName &&
              hidePrefix
                ? property.qualifiedName.substring(parentLength + 1)
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
