import type { FC } from "react";
import React, { Fragment } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { MapProperty } from "../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  PrimitiveTypes,
} from "../../shared/resources/ResourceTypes";
import { Button, Textarea, TextInput } from "flowbite-react";
import { HiMinusCircle, HiPlusCircle } from "react-icons/hi";
import classNames from "classnames";
import type { ConfigFieldProps } from "./ConfigField";
import { findChildProperty } from "./ConfigField";
import { ConfigSection } from "./ConfigSection";
import { ConfigGroup } from "./ConfigGroup";
import { env } from "../../shared/environment";
import { BiSolidHand, BiSolidPencil } from "react-icons/bi";

type MapProps = ConfigFieldProps & {
  removable?: boolean;
};

export const MapField: FC<MapProps> = ({
  qualifiedFieldName,
  field,
  removable,
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
      minLength: field.required ? 1 : 0,
    },
  });

  if (
    keyType === PrimitiveTypes.String &&
    valueType === PrimitiveTypes.String
  ) {
    return <PrimitiveMapEntry id={qualifiedFieldName} />;
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
      className={classNames({
        "border-primary-500 dark:border-primary-400 border-2 rounded-lg dark:[&_input]:border-transparent [&_input]:border-transparent":
          false, //todo: isModified,
      })}
      id={qualifiedFieldName}
      readOnly={configurationDisabled}
      {...register(qualifiedFieldName ?? "")}
    />
  );
};

type PrimitiveMapEntryProps = {
  id: string;
};

const PrimitiveMapEntry: FC<PrimitiveMapEntryProps> = ({ id }) => {
  const { register, control, formState } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: id,
  });
  const { dirtyFields, touchedFields, errors } = formState;
  const error = findChildProperty(errors, id);
  return (
    <div className="flex w-full flex-col gap-1">
      {fields.map((field, index) => {
        return (
          <Fragment key={field.id}>
            {env.debug.has("config-state") && (
              <div className={"flex flex-row justify-between"}>
                <div>
                  {findChildProperty(touchedFields, `${id}[${index}].key`) ===
                    true && (
                    <span className={"inline-flex text-blue-500"}>
                      <BiSolidHand />
                    </span>
                  )}
                  {findChildProperty(dirtyFields, `${id}[${index}].key`) ===
                    true && (
                    <span className={"inline-flex  text-yellow-700"}>
                      <BiSolidPencil />
                    </span>
                  )}
                </div>
                <div>
                  <div>
                    {findChildProperty(
                      touchedFields,
                      `${id}[${index}].value`,
                    ) === true && (
                      <span className={"inline-flex text-blue-500"}>
                        <BiSolidHand />
                      </span>
                    )}
                    {findChildProperty(dirtyFields, `${id}[${index}].value`) ===
                      true && (
                      <span className={"inline-flex  text-yellow-700"}>
                        <BiSolidPencil />
                      </span>
                    )}
                    <div></div>
                  </div>
                </div>
              </div>
            )}
            <div className="my-[.1rem] flex flex-row gap-1">
              <TextInput
                sizing={"sm"}
                className={"w-[50%]"}
                id={`${id}[${index}].key`}
                {...register(`${id}[${index}].key`)}
                helperText={error && <span>{error.message?.toString()}</span>}
              />
              <TextInput
                sizing={"sm"}
                className={"w-[50%]"}
                id={`${id}[${index}].value`}
                {...register(`${id}[${index}].value`)}
                helperText={error && <span>{error.message?.toString()}</span>}
              />
              <Button
                className={"h-full w-8"}
                color={"red"}
                size={"md"}
                onClick={() => {
                  remove(index);
                }}
              >
                <HiMinusCircle />
              </Button>
            </div>
          </Fragment>
        );
      })}
      <Button
        size={"sm"}
        className={"mt-1 w-fit"}
        color="purple"
        onClick={() => {
          append({ key: "", value: "" });
        }}
      >
        <HiPlusCircle />
      </Button>
    </div>
  );
};
