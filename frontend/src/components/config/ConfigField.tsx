import type { CheckboxProps, TextInputProps } from "flowbite-react";
import {
  Button,
  Checkbox,
  Dropdown,
  Label,
  TextInput,
  Tooltip,
} from "flowbite-react";
import type { FC, PropsWithChildren } from "react";
import React, { Fragment, useCallback, useEffect, useState } from "react";

import { type RegisterOptions, useFormContext } from "react-hook-form";

import useApplicationStore from "../../pages/store/ApplicationStore";
import { NodeId } from "../../shared/architecture/TopologyNode";
import { ListField } from "./ListField";
import { MapField } from "./MapField";
import type {
  EnumProperty,
  ListProperty,
  MapProperty,
  NumberProperty,
  Property,
  ResourceProperty,
  StringProperty,
} from "../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  PrimitiveTypes,
} from "../../shared/resources/ResourceTypes";
import classNames from "classnames";
import { BiChevronRight, BiSolidHand, BiSolidPencil } from "react-icons/bi";
import { env } from "../../shared/environment";
import { HiMiniArrowUpRight } from "react-icons/hi2";
import { IoInformationCircleOutline } from "react-icons/io5";

export interface ConfigFieldProps {
  configResource?: NodeId;
  // qualifiedFieldName is the qualified name of the field, including the resource id prefix
  // in the format `${resourceId}#${fieldName}`.
  qualifiedFieldName: string;
  field: Property;
  title?: string;
  required?: boolean;
  disabled?: boolean;
  valueSelector?: string;
}

type InputProps = {
  qualifiedFieldName: string;
  rules?: RegisterOptions;
  required?: boolean;
  error?: any;
  valueSelector?: string;
} & TextInputProps;

type TextProps = TextInputProps &
  ConfigFieldProps & {
    field: StringProperty;
  };

type NumberProps = {
  field: NumberProperty;
} & TextInputProps &
  ConfigFieldProps;

type BooleanProps = {
  error?: any;
  valueSelector?: string;
} & CheckboxProps &
  ConfigFieldProps;

type ResourceProps = {
  qualifiedFieldName: string;
  resourceTypes?: string[];
  disabled?: boolean;
  required?: boolean;
  error?: any;
  valueSelector?: string;
};

type EnumProps = {
  qualifiedFieldName: string;
  allowedValues?: string[];
  disabled?: boolean;
  required?: boolean;
  error?: any;
  valueSelector?: string;
};

export const ConfigField: FC<ConfigFieldProps> = ({
  field,
  qualifiedFieldName,
  title,
  required,
  valueSelector,
  ...props
}) => {
  const { type, configurationDisabled } = field;
  const { formState } = useFormContext();
  const { errors, touchedFields, dirtyFields, defaultValues } = formState;
  const id = qualifiedFieldName + (valueSelector ?? "");
  const error = findChildProperty(errors, id);
  const touched = findChildProperty(touchedFields, id);
  const dirty = findChildProperty(dirtyFields, id);

  let element: React.ReactElement;
  switch (type) {
    case PrimitiveTypes.String:
      element = (
        <StringField
          qualifiedFieldName={qualifiedFieldName}
          field={field}
          valueSelector={valueSelector}
          required={required}
          {...props}
          color={error ? "failure" : undefined}
          helperText={<InputHelperText error={error} />}
        />
      );
      break;
    case PrimitiveTypes.Number:
      element = (
        <NumberField
          qualifiedFieldName={qualifiedFieldName}
          field={field as NumberProperty}
          valueSelector={valueSelector}
          required={required}
          {...props}
          color={error ? "failure" : undefined}
          helperText={<InputHelperText error={error} />}
        />
      );
      break;
    case PrimitiveTypes.Integer:
      element = (
        <IntField
          qualifiedFieldName={qualifiedFieldName}
          field={field as NumberProperty}
          valueSelector={valueSelector}
          required={required}
          {...props}
          color={error ? "failure" : undefined}
          helperText={<InputHelperText error={error} />}
        />
      );
      break;
    case PrimitiveTypes.Boolean:
      element = (
        <BooleanField
          qualifiedFieldName={qualifiedFieldName}
          field={field}
          valueSelector={valueSelector}
          {...props}
          color={error ? "failure" : undefined}
          required={required}
          error={error}
        />
      );
      break;
    case CollectionTypes.List:
    case CollectionTypes.Set:
      element = (
        <ListField
          qualifiedFieldName={qualifiedFieldName}
          field={field as ListProperty}
          {...props}
        />
      );
      break;
    case CollectionTypes.Map:
      element = (
        <MapField
          qualifiedFieldName={qualifiedFieldName}
          field={field as MapProperty}
          {...props}
        />
      );
      break;
    case PrimitiveTypes.Resource:
      element = (
        <ResourceField
          qualifiedFieldName={qualifiedFieldName ?? "UNKNOWN-RESOURCE"}
          disabled={configurationDisabled}
          resourceTypes={(field as ResourceProperty).resourceTypes}
          valueSelector={valueSelector}
          required={required}
          error={error}
          {...props}
        />
      );
      break;
    case PrimitiveTypes.Enum:
      element = (
        <EnumField
          qualifiedFieldName={qualifiedFieldName ?? "UNKNOWN-ENUM"}
          allowedValues={(field as EnumProperty).allowedValues}
          valueSelector={valueSelector}
          disabled={configurationDisabled}
          required={required}
          error={error}
          {...props}
        />
      );
      break;
    default:
      console.warn(`Unknown property type: ${type}`);
      element = <></>;
  }

  // TODO do something with displayedResource
  if (!title) {
    title = qualifiedFieldName || field.qualifiedName || "";
  }

  const silenceRequired =
    (required || field.required) &&
    field.type === PrimitiveTypes.Enum &&
    defaultValues?.[qualifiedFieldName] !== undefined;

  return (
    <>
      {type !== CollectionTypes.Map ||
      (field as MapProperty).valueType !== CollectionTypes.Map ? (
        <>
          <div className="flex flex-col gap-1">
            <Label
              title={title}
              htmlFor={qualifiedFieldName}
              className={"flex w-full"}
              color={error ? "failure" : "default"}
            >
              <div
                className={
                  "flex max-w-[95%] items-center gap-1 [&>span:first-child]:hidden"
                }
              >
                {title.split(".").map((part, index) => {
                  return (
                    <Fragment key={index}>
                      <span className="px-1">
                        <BiChevronRight />
                      </span>
                      <span
                        className={"w-fit overflow-hidden text-ellipsis "}
                        key={index}
                      >
                        {part}
                      </span>
                    </Fragment>
                  );
                })}
                {field.description && (
                  <Tooltip
                    content={
                      <div className="max-w-sm">{field.description}</div>
                    }
                  >
                    <IoInformationCircleOutline size={12} />
                  </Tooltip>
                )}
                {field.required && !silenceRequired && (
                  <div className={"text-red-600"}>*</div>
                )}
                {env.debug.has("config-state") && (
                  <div className={"flex flex-row"}>
                    {touched === true && (
                      <span className={"inline-flex text-blue-500"}>
                        <BiSolidHand />
                      </span>
                    )}
                    {dirty === true && (
                      <span className={"inline-flex  text-yellow-700"}>
                        <BiSolidPencil />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Label>
            {element}
          </div>
        </>
      ) : (
        element
      )}
    </>
  );
};

export const StringField: FC<TextProps> = ({
  qualifiedFieldName,
  field,
  valueSelector,
  ...rest
}) => {
  return (
    <InputField
      qualifiedFieldName={qualifiedFieldName ?? field.qualifiedName}
      inputMode="text"
      type="text"
      valueSelector={valueSelector}
      rules={{
        minLength: field.minLength
          ? {
              value: field.minLength,
              message: `${field.name} must be at least ${field.minLength} characters in length.`,
            }
          : undefined,
        maxLength: field.maxLength
          ? {
              value: field.maxLength,
              message: `${field.name} may be at most ${field.maxLength} characters in length.`,
            }
          : undefined,
      }}
      disabled={field.configurationDisabled}
      required={field.required}
      {...rest}
    />
  );
};

export const NumberField: FC<NumberProps> = ({
  qualifiedFieldName,
  field,
  valueSelector,
  ...rest
}) => {
  return (
    <InputField
      qualifiedFieldName={qualifiedFieldName ?? field.qualifiedName}
      inputMode="numeric"
      type="number"
      rules={{
        min: field.minValue
          ? {
              value: field.minValue,
              message: `${field.name} must be at least ${field.minValue}`,
            }
          : undefined,
        max: field.maxValue
          ? {
              value: field.maxValue,
              message: `${field.name} may not exceed ${field.maxValue}.`,
            }
          : undefined,
      }}
      valueSelector={valueSelector}
      disabled={field.configurationDisabled}
      required={field.required}
      // validate minValue and maxValue
      {...rest}
    />
  );
};

export const IntField: FC<NumberProps> = ({
  qualifiedFieldName,
  field,
  valueSelector,
  ...rest
}) => {
  return (
    <InputField
      qualifiedFieldName={qualifiedFieldName ?? field.qualifiedName}
      inputMode="numeric"
      type="number"
      step="1"
      rules={{
        min: field.minValue
          ? {
              value: field.minValue,
              message: `${field.name} must be at least ${field.minValue}`,
            }
          : undefined,
        max: field.maxValue
          ? {
              value: field.maxValue,
              message: `${field.name} may not exceed ${field.maxValue}.`,
            }
          : undefined,
      }}
      valueSelector={valueSelector}
      required={field.required}
      disabled={field.configurationDisabled}
      {...rest}
    />
  );
};

const InputField: FC<InputProps> = ({
  qualifiedFieldName,
  required,
  valueSelector,
  rules,
  error,
  ...rest
}) => {
  const { register } = useFormContext();
  const id = qualifiedFieldName + (valueSelector ?? "");
  return (
    <TextInput
      sizing={"sm"}
      id={id}
      disabled={rest.disabled}
      color={error ? "failure" : "gray"}
      helperText={<InputHelperText error={error} />}
      {...rest}
      {...register(id, {
        required:
          required && `${qualifiedFieldName.split(".").pop()} is required.`,
        ...rules,
      })}
    />
  );
};

export const BooleanField: FC<BooleanProps> = ({
  qualifiedFieldName,
  field,
  valueSelector,
  required,
  ...props
}) => {
  const { register } = useFormContext();
  const { configurationDisabled } = field;
  const id = qualifiedFieldName + (valueSelector ?? "");
  return (
    <Checkbox
      id={id}
      disabled={configurationDisabled}
      {...props}
      {...register(id, {
        required:
          required && `${qualifiedFieldName.split(".").pop()} is required.`,
      })}
    />
  );
};

export const ResourceField: FC<ResourceProps> = ({
  qualifiedFieldName,
  disabled,
  resourceTypes,
  required,
  valueSelector,
}) => {
  const { register, unregister, setValue, watch, formState } = useFormContext();
  const { errors } = formState;
  const error = findChildProperty(
    errors,
    qualifiedFieldName + (valueSelector ?? ""),
  );
  const { environmentVersion, selectResource } = useApplicationStore();
  const onClick = (value: string) => {
    setValue(id, value, {
      shouldTouch: true,
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const id = qualifiedFieldName + (valueSelector ?? "");
  const [items, setItems] = useState<string[]>([]);

  const watchValue = watch(id);

  const refreshItems = useCallback(() => {
    const emptyFilter = resourceTypes?.length === 1 && !resourceTypes[0];
    return emptyFilter
      ? [...environmentVersion.resources.keys()]
      : [...environmentVersion.resources.keys()].filter(
          (resourceId: string) => {
            const providerType = resourceId.split(":").slice(0, 2).join(":");
            return (
              !resourceTypes?.length || resourceTypes?.includes(providerType)
            );
          },
        );
  }, [environmentVersion, resourceTypes]);

  useEffect(() => {
    setItems(refreshItems());
  }, [refreshItems]);

  useEffect(() => {
    register(id, {
      required:
        required && `${qualifiedFieldName.split(".").pop()} is required.`,
    });
    return () => {
      unregister(id, { keepDefaultValue: true });
    };
  }, [id, qualifiedFieldName, unregister, register, required]);

  return (
    <div className="flex gap-1">
      <ErrorHelper error={error}>
        <Dropdown
          size={"xs"}
          className="max-h-[50vh] overflow-y-auto"
          id={id}
          color={"purple"}
          disabled={disabled}
          label={
            watchValue?.length
              ? NodeId.parse(watchValue).name
              : "Select a resource"
          }
        >
          {items.map((resourceId: string) => {
            return (
              <Dropdown.Item
                key={resourceId}
                onClick={() => onClick(resourceId)}
              >
                {resourceId}
              </Dropdown.Item>
            );
          })}
          {!items.length && (
            <Dropdown.Item disabled={true}>
              No resources{" "}
              {resourceTypes
                ? "of type " +
                  (resourceTypes.length > 1 ? "s" : "") +
                  resourceTypes.join(", ")
                : ""}{" "}
              available
            </Dropdown.Item>
          )}
        </Dropdown>
      </ErrorHelper>
      {!!watchValue?.length && (
        <Button
          title={"Show this resource"}
          className={"size-[16px] rounded-md"}
          color={"light"}
          onClick={() => {
            selectResource(NodeId.parse(watchValue));
          }}
        >
          <HiMiniArrowUpRight size={12} />
        </Button>
      )}
    </div>
  );
};

export const EnumField: FC<EnumProps> = ({
  qualifiedFieldName,
  allowedValues,
  disabled,
  required,
  error,
  valueSelector,
}) => {
  const id = qualifiedFieldName + (valueSelector ?? "");
  const { register, unregister, setValue, watch, formState } = useFormContext();
  const { defaultValues } = formState;
  const onClick = (value: string | null) => {
    setValue(id, value, {
      shouldTouch: true,
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const silenceRequired = defaultValues?.[qualifiedFieldName] !== undefined;

  const watchValue = watch(id);

  useEffect(() => {
    register(
      id,
      silenceRequired
        ? undefined
        : {
            required:
              required && `${qualifiedFieldName.split(".").pop()} is required.`,
          },
    );
    return () => {
      unregister(id, { keepDefaultValue: true });
    };
  }, [id, qualifiedFieldName, register, required, unregister]);

  return (
    <ErrorHelper error={error}>
      <Dropdown
        size={"xs"}
        className="max-h-[50vh] overflow-y-auto"
        id={qualifiedFieldName}
        color={"purple"}
        disabled={disabled}
        label={watchValue ?? "Select a value"}
      >
        {!required && (
          <Dropdown.Item className={"italic"} onClick={() => onClick(null)}>
            Select a value
          </Dropdown.Item>
        )}
        {allowedValues?.map((value: string) => {
          return (
            <Dropdown.Item key={value} onClick={() => onClick(value)}>
              {value}
            </Dropdown.Item>
          );
        })}
      </Dropdown>
    </ErrorHelper>
  );
};

export const ErrorHelper: FC<PropsWithChildren<{ error?: any }>> = ({
  error,
  children,
}) => {
  return error ? (
    <div
      className={classNames("flex flex-col gap-1", {
        "block w-full border disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500 p-2.5 border-red-500 text-red-900 placeholder-red-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 focus:outline-none focus:ring-1":
          error,
      })}
    >
      {children}
      <div className="mt-2 block max-h-20 max-w-full overflow-auto text-sm text-red-600 dark:text-red-500">
        {error.root && <p>{error.root.message?.toString()}</p>}
        <p>{error.message?.toString()}</p>
      </div>
    </div>
  ) : (
    <>{children}</>
  );
};

// findChildProperty finds a child property of an object by path.
// A period indicates a child property, a "[]" indicates an array index.
export function findChildProperty(obj: any, path: string): any {
  const parts = path.split(/[[.]/);
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined) {
      return undefined;
    }
    if (part.endsWith("]")) {
      const index = parseInt(
        part.substring(part.indexOf("[") + 1, part.length),
      );
      current = current[index];
    } else {
      current = current[part];
    }
  }
  return current;
}

export const InputHelperText: FC<{ error?: any }> = ({ error }) => {
  return (
    error?.message && (
      <span className={"block max-w-full overflow-auto"}>
        {error.message.toString()}
      </span>
    )
  );
};
