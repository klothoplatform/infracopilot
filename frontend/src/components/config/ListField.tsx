import type { FC } from "react";
import React, { Fragment, useEffect, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type {
  EnumProperty,
  ListProperty,
  Property,
  ResourceProperty,
} from "../../shared/resources/ResourceTypes";
import { getNewValue } from "../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  isCollection,
  isPrimitive,
  PrimitiveTypes,
} from "../../shared/resources/ResourceTypes";
import { Button, Checkbox, Textarea, TextInput } from "flowbite-react";
import { HiMinusCircle, HiPlusCircle } from "react-icons/hi";
import type { ConfigFieldProps } from "./ConfigField";
import {
  InputHelperText,
  EnumField,
  ErrorHelper,
  findChildProperty,
  ResourceField,
} from "./ConfigField";
import { ConfigSection } from "./ConfigSection";
import { ConfigGroup } from "./ConfigGroup";
import classNames from "classnames";
import { PrimitiveTable } from "./PrimitiveTable";
import { NodeId } from "../../shared/architecture/TopologyNode";

const tableViewFieldMappings: {
  [key: string]: {
    [key: string]: string[];
  };
} = {
  "kubernetes:pod": {
    "Object.spec.containers.env": ["name", "value"],
  },
  "aws:ecs_task_definition": {
    "ContainerDefinitions.Environment": ["Name", "Value"],
  },
};

type ListProps = ConfigFieldProps & {
  field: ListProperty;
};

export const ListField: FC<ListProps> = ({
  configResource,
  qualifiedFieldName,
  field,
  disabled,
}) => {
  qualifiedFieldName = qualifiedFieldName ?? "UNKNOWN-LIST";
  const { register, control, formState } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: qualifiedFieldName,
    rules: {
      required: field.required && `${qualifiedFieldName} is required.`,
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
        uniqueItems: (items: any[]) => {
          if (field.uniqueItems) {
            const uniqueValues = new Set();
            for (const item of items) {
              const value = JSON.stringify(item);
              if (uniqueValues.has(value)) {
                return `${qualifiedFieldName} must have unique values.`;
              }
              uniqueValues.add(value);
            }
          }
          return true;
        },
      },
    },
  });
  const { errors } = formState;
  const error = findChildProperty(errors, qualifiedFieldName);
  const { configurationDisabled, itemType, properties } = field as ListProperty;

  disabled = configurationDisabled || disabled;

  if (isPrimitive(itemType)) {
    return (
      <ErrorHelper error={error}>
        <div
          className={classNames("flex flex-col gap-1", {
            "block w-full border disabled:cursor-not-allowed disabled:opacity-50 border-red-500 bg-red-50 text-red-900 placeholder-red-700 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:bg-red-100 dark:focus:border-red-500 dark:focus:ring-red-500 p-2 sm:text-xs rounded-lg":
              error,
          })}
        >
          {fields.map((formField, index) => {
            return (
              <PrimitiveListItem
                key={formField.id}
                index={index}
                qualifiedFieldName={`${qualifiedFieldName}[${index}]`}
                type={itemType}
                required={field.required}
                resourceTypes={(field as ResourceProperty).resourceTypes}
                allowedValues={(field as EnumProperty).allowedValues}
                disabled={disabled}
                remove={remove}
              />
            );
          })}
          {!disabled && (
            <Button
              className={"mt-1 w-fit"}
              size="sm"
              color="purple"
              onClick={() => {
                append({ value: "" });
              }}
            >
              <HiPlusCircle />
            </Button>
          )}
        </div>
      </ErrorHelper>
    );
  }

  if (isCollection(itemType)) {
    const resourceType =
      configResource?.qualifiedType ||
      (qualifiedFieldName.includes("#")
        ? NodeId.parse(qualifiedFieldName.split("#")[0]).qualifiedType
        : null);

    const tableViewFields =
      resourceType &&
      tableViewFieldMappings[resourceType]?.[field.qualifiedName];
    if (tableViewFields) {
      return (
        <PrimitiveTable
          id={qualifiedFieldName}
          disabled={disabled}
          properties={tableViewFields}
        />
      );
    }
    return (
      <ErrorHelper error={error}>
        <div className="flex flex-col gap-1">
          {fields.map((formField, index) => {
            return (
              <CollectionListItem
                key={formField.id}
                index={index}
                qualifiedFieldName={`${qualifiedFieldName}[${index}]`}
                type={itemType}
                properties={properties}
                required={field.required}
                disabled={disabled}
                remove={remove}
              />
            );
          })}
          {!disabled && (
            <Button
              size="sm"
              className={"mt-1 size-fit"}
              color="purple"
              onClick={() => append(getNewValue(properties))}
            >
              <HiPlusCircle />
            </Button>
          )}
        </div>
      </ErrorHelper>
    );
  }

  console.warn(`Unknown property type: ${itemType}`);
  return (
    <Textarea
      id={qualifiedFieldName}
      disabled={configurationDisabled}
      {...register(qualifiedFieldName ?? "")}
    />
  );
};

const PrimitiveListItem: FC<{
  index: number;
  qualifiedFieldName: string;
  type: PrimitiveTypes;
  allowedValues?: string[];
  resourceTypes?: string[];
  disabled?: boolean;
  required?: boolean;
  remove: (index: number) => void;
}> = ({
  index,
  qualifiedFieldName,
  type,
  allowedValues,
  resourceTypes,
  required,
  disabled,
  remove,
}) => {
  const id = `${qualifiedFieldName}.value`;
  const { register, formState } = useFormContext();
  const { errors } = formState;
  const [error, setError] = useState<any>();

  useEffect(() => {
    const error = errors[qualifiedFieldName as string];
    if (error) {
      setError(error);
    }
  }, [errors, qualifiedFieldName]);
  let item: React.ReactNode;
  switch (type) {
    case PrimitiveTypes.String:
      item = (
        <TextInput
          sizing={"sm"}
          className={"w-full"}
          id={id}
          helperText={<InputHelperText error={error} />}
          {...register(id, {
            required:
              required && `${qualifiedFieldName.split(".").pop()} is required.`,
          })}
        />
      );
      break;
    case PrimitiveTypes.Number:
    case PrimitiveTypes.Integer:
      item = (
        <TextInput
          sizing={"sm"}
          className={"w-full"}
          id={id}
          {...register(id, {
            required:
              required && `${qualifiedFieldName.split(".").pop()} is required.`,
          })}
          type={"number"}
          {...(type === PrimitiveTypes.Integer ? { step: "1" } : {})}
          helperText={<InputHelperText error={error} />}
        />
      );
      break;
    case PrimitiveTypes.Boolean:
      item = (
        <ErrorHelper error={error}>
          <Checkbox
            id={id}
            {...register(id, {
              required:
                required &&
                `${qualifiedFieldName.split(".").pop()} is required.`,
            })}
          />
        </ErrorHelper>
      );
      break;
    case PrimitiveTypes.Resource:
      item = (
        <ResourceField
          qualifiedFieldName={qualifiedFieldName}
          valueSelector={".value"}
          disabled={disabled}
          required={required}
          resourceTypes={resourceTypes}
          error={error}
        />
      );
      break;
    case PrimitiveTypes.Enum:
      item = (
        <EnumField
          qualifiedFieldName={qualifiedFieldName}
          valueSelector={".value"}
          allowedValues={allowedValues}
          disabled={disabled}
          required={required}
          error={error}
        />
      );
      break;
    default:
      console.warn(`Unknown property type: ${type}`);
  }
  return (
    <Fragment key={index}>
      <div className="my-[.1rem] flex w-full flex-row gap-1">
        <div className="w-full overflow-hidden p-[1px]">{item}</div>
        {!disabled && (
          <Button
            className={"h-fit w-6"}
            size={"md"}
            color="red"
            onClick={() => {
              remove(index);
            }}
          >
            <HiMinusCircle />
          </Button>
        )}
      </div>
    </Fragment>
  );
};

const CollectionListItem: FC<{
  index: number;
  qualifiedFieldName: string;
  type: CollectionTypes;
  properties?: Property[];
  disabled?: boolean;
  required?: boolean;
  remove: (index: number) => void;
}> = ({
  index,
  qualifiedFieldName,
  type,
  properties,
  disabled,
  required,
  remove,
}) => {
  // Trim the resource name from the field name for the title.
  const title = qualifiedFieldName.split("#", 2)[1];
  let item: React.ReactNode;
  switch (type) {
    case CollectionTypes.Map:
      item = (
        <ConfigSection id={qualifiedFieldName} title={title}>
          <ConfigGroup
            qualifiedFieldName={qualifiedFieldName}
            fields={properties}
            hidePrefix
          />
        </ConfigSection>
      );
      break;
    case CollectionTypes.Set:
    case CollectionTypes.List:
      item = (
        <ConfigSection id={qualifiedFieldName} title={title}>
          <ConfigGroup
            qualifiedFieldName={qualifiedFieldName}
            fields={properties}
            hidePrefix
          />
        </ConfigSection>
      );
      break;
    default:
      console.warn(`Unknown property type: ${type}`);
  }
  return (
    <div className="my-[.1rem] flex w-full flex-row gap-1">
      <div className="w-full">{item}</div>
      {!disabled && (
        <Button
          className={"h-8 w-6"}
          color="red"
          size={"sm"}
          onClick={() => {
            remove(index);
          }}
        >
          <HiMinusCircle />
        </Button>
      )}
    </div>
  );
};
