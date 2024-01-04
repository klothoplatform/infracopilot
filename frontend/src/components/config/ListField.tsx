import type { FC } from "react";
import React, { Fragment, useEffect, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type {
  EnumProperty,
  ListProperty,
  Property,
  ResourceProperty,
} from "../../shared/resources/ResourceTypes";
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
  EnumField,
  ErrorHelper,
  findChildProperty,
  ResourceField,
} from "./ConfigField";
import { ConfigSection } from "./ConfigSection";
import { ConfigGroup } from "./ConfigGroup";
import classNames from "classnames";
import { env } from "../../shared/environment";
import { BiSolidHand, BiSolidPencil } from "react-icons/bi";
import type { NodeId } from "../../shared/architecture/TopologyNode";

type ListProps = ConfigFieldProps;

export const ListField: FC<ListProps> = ({ configResource, qualifiedFieldName, field }) => {
  qualifiedFieldName = qualifiedFieldName ?? "UNKNOWN-LIST";

  const { register, control, formState } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: qualifiedFieldName,
    rules: {
      required:
        field.required && `${qualifiedFieldName} must have at least one entry.`,
    },
  });
  const { errors } = formState;
  const error = findChildProperty(errors, qualifiedFieldName);
  const { configurationDisabled, itemType, properties } = field as ListProperty;

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
                configResource={configResource}
                qualifiedFieldName={`${qualifiedFieldName}[${index}]`}
                type={itemType}
                required={field.required}
                resourceTypes={(field as ResourceProperty).resourceTypes}
                allowedValues={(field as EnumProperty).allowedValues}
                readOnly={configurationDisabled}
                remove={remove}
              />
            );
          })}
          {!configurationDisabled && (
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
    return (
      <ErrorHelper error={error}>
        <div className="flex flex-col gap-1">
          {fields.map((formField, index) => {
            return (
              <CollectionListItem
                key={formField.id}
                index={index}
                configResource={configResource}
                qualifiedFieldName={`${qualifiedFieldName}[${index}]`}
                type={itemType}
                properties={properties}
                required={field.required}
                readOnly={field.configurationDisabled}
                remove={remove}
              />
            );
          })}
          {!configurationDisabled && (
            <Button
              size="sm"
              className={"mt-1 h-fit w-fit"}
              color="purple"
              onClick={() => {
                append({});
              }}
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
      readOnly={configurationDisabled}
      {...register(qualifiedFieldName ?? "")}
    />
  );
};

const PrimitiveListItem: FC<{
  index: number;
  configResource: NodeId;
  qualifiedFieldName: string;
  type: PrimitiveTypes;
  allowedValues?: string[];
  resourceTypes?: string[];
  readOnly?: boolean;
  required?: boolean;
  remove: (index: number) => void;
}> = ({
  index,
  configResource,
  qualifiedFieldName,
  type,
  allowedValues,
  resourceTypes,
  required,
  readOnly,
  remove,
}) => {
  const id = `${qualifiedFieldName}.value`;
  const { register, formState } = useFormContext();
  const { errors } = formState;
  const [error, setError] = useState<any>();
  const { touchedFields, dirtyFields } = formState;

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
          helperText={error && <span>{error.message?.toString()}</span>}
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
          helperText={error && <span>{error.message?.toString()}</span>}
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
          configResource={configResource}
          qualifiedFieldName={qualifiedFieldName}
          valueSelector={".value"}
          readOnly={readOnly}
          required={required}
          resourceTypes={resourceTypes}
          error={error}
        />
      );
      break;
    case PrimitiveTypes.Enum:
      item = (
        <EnumField
          configResource={configResource}
          qualifiedFieldName={qualifiedFieldName}
          valueSelector={".value"}
          allowedValues={allowedValues}
          readOnly={readOnly}
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
      {env.debug.has("config-state") && (
        <div className={"flex flex-row"}>
          {findChildProperty(touchedFields, id) === true && (
            <span className={"inline-flex text-blue-500"}>
              <BiSolidHand />
            </span>
          )}
          {findChildProperty(dirtyFields, id) === true && (
            <span className={"inline-flex text-yellow-700"}>
              <BiSolidPencil />
            </span>
          )}
        </div>
      )}
      <div className="my-[.1rem] flex w-full flex-row gap-1">
        <div className="w-full">{item}</div>
        <Button
          className={"w-6"}
          size={"md"}
          color="red"
          onClick={() => {
            remove(index);
          }}
        >
          <HiMinusCircle />
        </Button>
      </div>
    </Fragment>
  );
};

const CollectionListItem: FC<{
  index: number;
  configResource: NodeId;
  qualifiedFieldName: string;
  type: CollectionTypes;
  properties?: Property[];
  readOnly?: boolean;
  required?: boolean;
  remove: (index: number) => void;
}> = ({
  index,
  configResource,
  qualifiedFieldName,
  type,
  properties,
  readOnly,
  required,
  remove,
}) => {
  let item: React.ReactNode;
  switch (type) {
    case CollectionTypes.Map:
      item = (
        <ConfigSection id={qualifiedFieldName}>
          <ConfigGroup
            configResource={configResource}
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
        <ConfigSection id={qualifiedFieldName}>
          <ConfigGroup
            configResource={configResource}
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
    </div>
  );
};
