import type { FC } from "react";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type {
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
import { ResourceField } from "./ConfigField";
import { ConfigSection } from "./ConfigSection";
import { ConfigGroup } from "./ConfigGroup";

type ListProps = ConfigFieldProps;

export const ListField: FC<ListProps> = ({ id, field }) => {
  id = id ?? field.qualifiedName;

  const { register, control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: id,
    rules: { required: field.required, minLength: field.required ? 1 : 0 },
  });

  const { configurationDisabled, itemType, properties } = field as ListProperty;

  if (isPrimitive(itemType)) {
    return (
      <div className="flex flex-col gap-1">
        {fields.map((formField, index) => {
          return (
            <PrimitiveListItem
              key={index}
              index={index}
              id={`${id}[${index}].value`}
              type={itemType}
              required={field.required}
              resourceTypes={(field as ResourceProperty).resourceTypes}
              remove={remove}
            />
          );
        })}
        {!configurationDisabled && (
          <Button
            className={"mt-1 w-fit"}
            color="purple"
            onClick={() => {
              append({ value: "" });
            }}
          >
            <HiPlusCircle />
          </Button>
        )}
      </div>
    );
  }

  if (isCollection(itemType)) {
    return (
      <div className="flex flex-col gap-1">
        {fields.map((formField, index) => {
          return (
            <CollectionListItem
              key={index}
              index={index}
              id={`${id}[${index}]`}
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
    );
  }

  console.warn(`Unknown property type: ${itemType}`);
  return (
    <Textarea
      id={id}
      readOnly={configurationDisabled}
      {...register(id ?? "")}
    />
  );
};

const PrimitiveListItem: FC<{
  index: number;
  id: string;
  type: PrimitiveTypes;
  readOnly?: boolean;
  required?: boolean;
  resourceTypes?: string[];
  remove: (index: number) => void;
}> = ({ index, id, type, readOnly, required, resourceTypes, remove }) => {
  const { register } = useFormContext();
  let item: React.ReactNode;
  switch (type) {
    case PrimitiveTypes.String:
      item = <TextInput className={"w-full"} id={id} {...register(id)} />;
      break;
    case PrimitiveTypes.Number:
    case PrimitiveTypes.Integer:
      item = (
        <TextInput
          className={"w-full"}
          id={id}
          {...register(id)}
          type={"number"}
          {...(type === PrimitiveTypes.Integer ? { step: "1" } : {})}
        />
      );
      break;
    case PrimitiveTypes.Boolean:
      item = <Checkbox id={id} {...register(id)} />;
      break;
    case PrimitiveTypes.Resource:
      item = (
        <ResourceField
          id={id}
          readOnly={readOnly}
          required={required}
          resourceTypes={resourceTypes}
        />
      );
      break;
    default:
      console.warn(`Unknown property type: ${type}`);
  }
  return (
    <div className="my-[.1rem] flex w-full flex-row gap-1">
      <div className="w-full">{item}</div>
      <Button
        className={"h-full w-10"}
        size={"lg"}
        color="red"
        onClick={() => {
          remove(index);
        }}
      >
        <HiMinusCircle />
      </Button>
    </div>
  );
};

const CollectionListItem: FC<{
  index: number;
  id: string;
  type: CollectionTypes;
  properties?: Property[];
  readOnly?: boolean;
  required?: boolean;
  remove: (index: number) => void;
}> = ({ index, id, type, properties, readOnly, required, remove }) => {
  let item: React.ReactNode;
  switch (type) {
    case CollectionTypes.Map:
      item = (
        <ConfigSection id={id}>
          <ConfigGroup qualifiedFieldName={id} fields={properties} hidePrefix />
        </ConfigSection>
      );
      break;
    case CollectionTypes.Set:
    case CollectionTypes.List:
      item = (
        <ConfigSection id={id}>
          <ConfigGroup qualifiedFieldName={id} fields={properties} hidePrefix />
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
        className={"mt-2 h-full w-10"}
        color="red"
        size={"xl"}
        onClick={() => {
          remove(index);
        }}
      >
        <HiMinusCircle />
      </Button>
    </div>
  );
};
