import type { FC } from "react";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { ListProperty } from "../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  isPrimitive,
  PrimitiveTypes,
} from "../../shared/resources/ResourceTypes";
import { Button, Checkbox, Textarea, TextInput } from "flowbite-react";
import { HiMinusCircle, HiPlusCircle } from "react-icons/hi";
import classNames from "classnames";
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
  });

  const { configurationDisabled, itemType, properties } = field as ListProperty;

  const items = fields.map((formField, index) => {
    let item: React.ReactNode;
    switch (itemType) {
      case PrimitiveTypes.String:
        item = (
          <TextInput
            className={"w-full"}
            id={`${id}[${index}]`}
            {...register(`${id}[${index}]`)}
          />
        );
        break;
      case PrimitiveTypes.Number:
      case PrimitiveTypes.Integer:
        item = (
          <TextInput
            className={"w-full"}
            id={`${id}[${index}]`}
            {...register(`${id}[${index}]`)}
            type={"number"}
            {...(itemType === PrimitiveTypes.Integer ? { step: "1" } : {})}
          />
        );
        break;
      case PrimitiveTypes.Boolean:
        item = (
          <Checkbox
            id={`${id}[${index}]`}
            readOnly={configurationDisabled}
            {...register(`${id}[${index}]`)}
          />
        );
        break;
      case PrimitiveTypes.Resource:
        item = (
          <ResourceField
            id={`${id}[${index}]`}
            readonly={configurationDisabled}
            resourceTypes={[]}
          />
        );
        break;
      case CollectionTypes.Map:
        item = (
          <ConfigSection id={`${id}[${index}]`}>
            <ConfigGroup
              qualifiedFieldName={`${id}[${index}]`}
              fields={properties}
              hidePrefix
            />
          </ConfigSection>
        );
        break;
      case CollectionTypes.Set:
      case CollectionTypes.List:
        item = (
          <ConfigSection id={`${id}[${index}]`}>
            <ConfigGroup
              qualifiedFieldName={`${id}[${index}]`}
              fields={properties}
              hidePrefix
            />
          </ConfigSection>
        );
        break;
      default:
        console.warn(`Unknown property type: ${itemType}`);
    }

    return (
      <div key={formField.id} className="my-[.1rem] flex w-full flex-row gap-1">
        <div className="w-full">{item}</div>
        <Button
          className="h-fit w-fit"
          color="purple"
          size={"xs"}
          onClick={() => {
            remove(index);
          }}
        >
          <HiMinusCircle />
        </Button>
      </div>
    );
  });

  if (isPrimitive(itemType)) {
    return (
      <div className="flex flex-col gap-1">
        {items}
        <Button
          className={"mt-1 w-fit"}
          color="purple"
          onClick={() => {
            append({});
          }}
        >
          <HiPlusCircle />
        </Button>
      </div>
    );
  }

  switch (itemType) {
    case CollectionTypes.Map:
      return (
        <div className="flex flex-col gap-1">
          {items}
          <Button
            className={"mt-1 h-fit w-fit"}
            color="purple"
            onClick={() => {
              append({});
            }}
          >
            <HiPlusCircle />
          </Button>
        </div>
      );
    case CollectionTypes.Set:
    case CollectionTypes.List:
      return (
        <div className="flex flex-col gap-1">
          {items}
          <Button
            className={"mt-1 h-fit w-fit"}
            color="purple"
            onClick={() => {
              append({});
            }}
          >
            <HiPlusCircle />
          </Button>
        </div>
      );
    default:
      console.warn(`Unknown property type: ${itemType}`);
  }

  return (
    <Textarea
      id={id}
      readOnly={configurationDisabled}
      {...register(id ?? "")}
    />
  );
};
