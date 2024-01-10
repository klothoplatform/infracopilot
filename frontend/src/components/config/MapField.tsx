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
  field: MapProperty;
  removable?: boolean;
};

export const MapField: FC<MapProps> = ({
  configResource,
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
    return <PrimitiveMap id={qualifiedFieldName} />;
  }
  if (keyType === PrimitiveTypes.String && valueType === CollectionTypes.Map) {
    return (
      <ConfigSection
        id={qualifiedFieldName}
        title={field.qualifiedName}
        removable={removable}
      >
        <ConfigGroup
          configResource={configResource}
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
      readOnly={configurationDisabled}
      {...register(qualifiedFieldName ?? "")}
    />
  );
};

type PrimitiveMapProps = {
  id: string;
};

const PrimitiveMap: FC<PrimitiveMapProps> = ({ id }) => {
  const { register, control, formState } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: id,
  });
  const { dirtyFields, touchedFields, errors } = formState;
  const error = findChildProperty(errors, id);
  const errorMessage =
    error?.type === "manual" ? error.message : error?.root?.message;

  return (
    <div
      className={classNames("flex w-full flex-col gap-1", {
        "p-2 rounded-lg border border-red-500 bg-red-50 dark:bg-red-100 dark:border-red-400 ":
          error?.root || error?.type === "manual",
      })}
    >
      {fields.map((field, index) => {
        return (
          <Fragment key={field.id}>
            {index === 0 && (
              <div
                className={classNames(
                  "mt-2 flex w-full gap-1 text-sm font-medium",
                  {
                    "dark:text-white": !error?.root && error?.type !== "manual",
                    "text-red-700 dark:text-red-500":
                      error?.root || error?.type === "manual",
                  },
                )}
              >
                <div className={"w-1/2"}>Key</div>
                <div className={"w-1/2"}>Value</div>
                <div className={"w-8 px-0.5"}></div>
              </div>
            )}
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
              />
              <TextInput
                sizing={"sm"}
                className={"w-[50%]"}
                id={`${id}[${index}].value`}
                {...register(`${id}[${index}].value`)}
              />
              <Button
                theme={{
                  size: {
                    md: "text-sm py-2",
                  },
                }}
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
      {(!!error?.root || error?.type === "manual") && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-500">
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};
