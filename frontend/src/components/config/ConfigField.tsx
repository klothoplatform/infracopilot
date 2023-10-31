import type { CheckboxProps, TextInputProps } from "flowbite-react";
import { Checkbox, Dropdown, Label, TextInput } from "flowbite-react";
import type { FC, PropsWithChildren } from "react";
import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import { useFormContext } from "react-hook-form";
import useApplicationStore from "../../views/store/ApplicationStore";
import { NodeId } from "../../shared/architecture/TopologyNode";
import { ListField } from "./ListField";
import { MapField } from "./MapField";
import type {
  EnumProperty,
  MapProperty,
  Property,
  ResourceProperty,
} from "../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  PrimitiveTypes,
} from "../../shared/resources/ResourceTypes";
import classNames from "classnames";
import { BiChevronRight } from "react-icons/bi";

export interface ConfigFieldProps {
  qualifiedFieldName?: string;
  field: Property;
  title?: string;
  required?: boolean;
  readOnly?: boolean;
  valueSelector?: string;
}

type InputProps = {
  qualifiedFieldName: string;
  required?: boolean;
  error?: any;
  valueSelector?: string;
} & TextInputProps;

type TextProps = TextInputProps & ConfigFieldProps;

type BooleanProps = {
  error?: any;
  valueSelector?: string;
} & CheckboxProps &
  ConfigFieldProps;

type ResourceProps = {
  qualifiedFieldName: string;
  resourceTypes?: string[];
  readOnly?: boolean;
  required?: boolean;
  error?: any;
  valueSelector?: string;
};

type EnumProps = {
  qualifiedFieldName: string;
  allowedValues?: string[];
  readOnly?: boolean;
  required?: boolean;
  error?: any;
  valueSelector?: string;
};

export const ConfigField: FC<ConfigFieldProps> = ({
  field,
  qualifiedFieldName,
  title,
  required,
  readOnly,
  valueSelector,
  ...props
}) => {
  const { type, qualifiedName, configurationDisabled } = field;
  const { formState } = useFormContext();
  const { errors } = formState;
  const error = findChildProperty(
    errors,
    `${qualifiedFieldName}${valueSelector ?? ""}`,
  );

  let element: React.ReactElement;
  switch (type) {
    case PrimitiveTypes.String:
      element = (
        <StringField
          qualifiedFieldName={qualifiedFieldName}
          field={field}
          valueSelector={valueSelector}
          {...props}
          color={error ? "failure" : undefined}
          helperText={error && <span>{error.message?.toString()}</span>}
        />
      );
      break;
    case PrimitiveTypes.Number:
      element = (
        <NumberField
          qualifiedFieldName={qualifiedFieldName}
          field={field}
          valueSelector={valueSelector}
          {...props}
          color={error ? "failure" : undefined}
          helperText={error && <span>{error.message?.toString()}</span>}
        />
      );
      break;
    case PrimitiveTypes.Integer:
      element = (
        <IntField
          qualifiedFieldName={qualifiedFieldName}
          field={field}
          valueSelector={valueSelector}
          {...props}
          color={error ? "failure" : undefined}
          helperText={error && <span>{error.message?.toString()}</span>}
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
      element = <ListField field={field} {...props} />;
      break;
    case CollectionTypes.Map:
      element = <MapField field={field} {...props} />;
      break;
    case PrimitiveTypes.Resource:
      element = (
        <ResourceField
          qualifiedFieldName={qualifiedFieldName ?? qualifiedName}
          readOnly={configurationDisabled}
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
          qualifiedFieldName={qualifiedFieldName ?? qualifiedName}
          allowedValues={(field as EnumProperty).allowedValues}
          valueSelector={valueSelector}
          readOnly={configurationDisabled}
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

  return (
    <>
      {type !== CollectionTypes.Map ||
      (field as MapProperty).valueType !== CollectionTypes.Map ? (
        <>
          <div className="flex flex-col gap-1">
            <Label
              title={title ?? qualifiedFieldName}
              htmlFor={qualifiedFieldName}
              className={"flex w-full"}
              color={error ? "failure" : "default"}
            >
              <div
                className={
                  "inline-flex max-w-[95%] items-center [&>span:first-child]:hidden"
                }
              >
                {(title ?? qualifiedFieldName ?? "")
                  .split(".")
                  .map((part, index) => {
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
              </div>
              {field.required && <div className={"text-red-600"}>*</div>}
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
      required={field.required}
      readOnly={field.configurationDisabled}
      {...rest}
    />
  );
};

export const NumberField: FC<TextProps> = ({
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
      valueSelector={valueSelector}
      required={field.required}
      readOnly={field.configurationDisabled}
      {...rest}
    />
  );
};

export const IntField: FC<TextProps> = ({
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
      valueSelector={valueSelector}
      required={field.required}
      readOnly={field.configurationDisabled}
      {...rest}
    />
  );
};

const InputField: FC<InputProps> = ({
  qualifiedFieldName,
  required,
  valueSelector,
  error,
  ...rest
}) => {
  const { register } = useFormContext();
  const id = qualifiedFieldName + (valueSelector ?? "");
  return (
    <TextInput
      sizing={"sm"}
      id={id}
      // required={required}
      disabled={rest.readOnly}
      color={error ? "failure" : "default"}
      helperText={error && <span>{error.message?.toString()}</span>}
      {...rest}
      {...register(id, {
        required: required && `${qualifiedFieldName} is required.`,
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
      readOnly={configurationDisabled}
      {...props}
      {...register(id, {
        required: required && `${qualifiedFieldName} is required.`,
      })}
    />
  );
};

export const ResourceField: FC<ResourceProps> = ({
  qualifiedFieldName,
  readOnly,
  resourceTypes,
  required,
  valueSelector,
}) => {
  const { register, setValue, watch } = useFormContext();
  const { architecture } = useApplicationStore();
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
      ? [...architecture.resources.keys()]
      : [...architecture.resources.keys()].filter((resourceId: string) => {
          const providerType = resourceId.split(":").slice(0, 2).join(":");
          return (
            !resourceTypes?.length || resourceTypes?.includes(providerType)
          );
        });
  }, [architecture, resourceTypes]);

  useEffect(() => {
    setItems(refreshItems());
  }, [refreshItems]);

  useLayoutEffect(() => {
    register(id, {
      required: required && `${qualifiedFieldName} is required.`,
    });
  });

  return (
    <Dropdown
      size={"xs"}
      className="max-h-[50vh] overflow-y-auto"
      id={id}
      color={"purple"}
      disabled={readOnly}
      label={
        watchValue?.length ? NodeId.parse(watchValue).name : "Select a resource"
      }
    >
      {items.map((resourceId: string) => {
        return (
          <Dropdown.Item key={resourceId} onClick={() => onClick(resourceId)}>
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
  );
};

export const EnumField: FC<EnumProps> = ({
  qualifiedFieldName,
  allowedValues,
  readOnly,
  required,
  error,
  valueSelector,
}) => {
  const id = qualifiedFieldName + (valueSelector ?? "");
  const { register, setValue, watch } = useFormContext();

  const onClick = (value: string) => {
    setValue(id, value, {
      shouldTouch: true,
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const watchValue = watch(id);

  useLayoutEffect(() => {
    register(id, {
      required: required && `${qualifiedFieldName} is required.`,
    });
  });

  return (
    <ErrorHelper error={error}>
      <Dropdown
        size={"xs"}
        className="max-h-[50vh] overflow-y-auto"
        id={qualifiedFieldName}
        color={"purple"}
        disabled={readOnly}
        label={watchValue ?? "Select a value"}
      >
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
        "block w-full border disabled:cursor-not-allowed disabled:opacity-50 border-red-500 bg-red-50 text-red-900 placeholder-red-700 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:bg-red-100 dark:focus:border-red-500 dark:focus:ring-red-500 p-2 sm:text-xs rounded-lg":
          error,
      })}
    >
      {children}
      <div className="mt-2 text-sm text-red-600 dark:text-red-500">
        {error.root && (
          <p className="font-medium">{error.root.message?.toString()}</p>
        )}
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
    if (part.endsWith("]")) {
      const index = parseInt(
        part.substring(part.indexOf("[") + 1, part.length),
      );
      current = current[index];
    } else {
      current = current[part];
    }
    if (!current) {
      return undefined;
    }
  }
  return current;
}
