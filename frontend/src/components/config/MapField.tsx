import type { FC } from "react";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { MapProperty } from "../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  PrimitiveTypes,
} from "../../shared/resources/ResourceTypes";
import { Textarea } from "flowbite-react";
import type { ConfigFieldProps } from "./ConfigField";
import { ConfigSection } from "./ConfigSection";
import { ConfigGroup } from "./ConfigGroup";
import { PrimitiveTable } from "./PrimitiveTable";

type MapProps = ConfigFieldProps & {
  field: MapProperty;
  removable?: boolean;
};

export const MapField: FC<MapProps> = ({
  qualifiedFieldName,
  field,
  removable,
  disabled,
}) => {
  qualifiedFieldName = qualifiedFieldName ?? "UNKNOWN-MAP";

  const { register, control } = useFormContext();
  const { configurationDisabled, keyType, valueType } = field as MapProperty;

  useFieldArray({
    control,
    name: qualifiedFieldName,
    rules: {
      required:
        field.required && `${qualifiedFieldName.split(".").pop()} is required.`,
      minLength: field.minLength
        ? {
            value: field.minLength,
            message: `${qualifiedFieldName} must have at least ${field.minLength} entries.`,
          }
        : undefined,
      maxLength: field.maxLength
        ? {
            value: field.maxLength,
            message: `${qualifiedFieldName} may have at most ${field.maxLength} entries.`,
          }
        : undefined,
      validate: {
        uniqueKeys: (items: any[]) => {
          if (!items?.length) {
            return true;
          }
          if (field.uniqueKeys && !field.properties?.length) {
            const uniqueKeys = new Set();
            for (const item of items) {
              const key = JSON.stringify(item.key);
              if (uniqueKeys.has(key)) {
                return `${qualifiedFieldName} must have unique keys.`;
              }
              uniqueKeys.add(key);
            }
          }
          return true;
        },
      },
    },
  });

  if (
    keyType === PrimitiveTypes.String &&
    valueType === PrimitiveTypes.String
  ) {
    return (
      <PrimitiveTable
        id={qualifiedFieldName}
        disabled={configurationDisabled || disabled}
        properties={["key", "value"]}
      />
    );
  }
  if (keyType === PrimitiveTypes.String && valueType === CollectionTypes.Map) {
    return (
      <ConfigSection
        id={qualifiedFieldName}
        title={field.qualifiedName}
        removable={removable}
      >
        <ConfigGroup
          qualifiedFieldName={qualifiedFieldName}
          fields={field.properties}
          hidePrefix
        />
      </ConfigSection>
    );
  }

  return (
    <Textarea
      id={qualifiedFieldName}
      disabled={configurationDisabled}
      {...register(qualifiedFieldName ?? "")}
    />
  );
};
