import type { CheckboxProps, TextInputProps } from "flowbite-react";
import { Checkbox, Dropdown, Label, TextInput } from "flowbite-react";
import type { FC } from "react";
import React, {
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

export interface ConfigFieldProps {
  id?: string;
  field: Property;
  title?: string;
  required?: boolean;
  readOnly?: boolean;
}

type InputProps = {
  id: string;
  required?: boolean;
} & TextInputProps;

type TextProps = TextInputProps & ConfigFieldProps;

type BooleanProps = CheckboxProps & ConfigFieldProps;
type ResourceProps = {
  id: string;
  resourceTypes?: string[];
  readOnly?: boolean;
  required?: boolean;
};

type EnumProps = {
  id: string;
  allowedValues?: string[];
  readOnly?: boolean;
  required?: boolean;
};

export const ConfigField: FC<ConfigFieldProps> = ({
  field,
  title,
  required,
  readOnly,
  ...props
}) => {
  const { type, qualifiedName, configurationDisabled } = field;
  let element: React.ReactElement;
  switch (type) {
    case PrimitiveTypes.String:
      element = <StringField id={qualifiedName} field={field} {...props} />;
      break;
    case PrimitiveTypes.Number:
      element = <NumberField id={qualifiedName} field={field} {...props} />;
      break;
    case PrimitiveTypes.Integer:
      element = <IntField id={qualifiedName} field={field} {...props} />;
      break;
    case PrimitiveTypes.Boolean:
      element = <BooleanField id={qualifiedName} field={field} {...props} />;
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
          id={qualifiedName}
          readOnly={configurationDisabled}
          resourceTypes={(field as ResourceProperty).resourceTypes}
          {...props}
        />
      );
      break;
    case PrimitiveTypes.Enum:
      element = (
        <EnumField
          id={qualifiedName}
          allowedValues={(field as EnumProperty).allowedValues}
          readOnly={configurationDisabled}
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
          <div className="mb-4 flex flex-col gap-1">
            <Label htmlFor={qualifiedName} className={"inline"}>
              {title ?? qualifiedName}
              {field.required && <span className={"text-red-600"}> *</span>}
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

export const StringField: FC<TextProps> = ({ id, field, ...rest }) => {
  return (
    <InputField
      id={id ?? field.qualifiedName}
      inputMode="text"
      type="text"
      required={field.required}
      readOnly={field.configurationDisabled}
      {...rest}
    />
  );
};

export const NumberField: FC<TextProps> = ({ id, field, ...rest }) => {
  return (
    <InputField
      id={id ?? field.qualifiedName}
      inputMode="numeric"
      type="number"
      required={field.required}
      readOnly={field.configurationDisabled}
      {...rest}
    />
  );
};

export const IntField: FC<TextProps> = ({ id, field, ...rest }) => {
  return (
    <InputField
      id={id ?? field.qualifiedName}
      inputMode="numeric"
      type="number"
      step="1"
      required={field.required}
      readOnly={field.configurationDisabled}
      {...rest}
    />
  );
};

const InputField: FC<InputProps> = ({ id, required, ...rest }) => {
  const { register } = useFormContext();

  return (
    <TextInput
      sizing={"sm"}
      id={id}
      required={required}
      disabled={rest.readOnly}
      {...rest}
      {...register(id, { required })}
    />
  );
};

export const BooleanField: FC<BooleanProps> = ({ id, field, ...props }) => {
  const { register } = useFormContext();
  const { configurationDisabled } = field;

  return (
    <Checkbox
      id={id}
      readOnly={configurationDisabled}
      {...props}
      {...register(id ?? "")}
    />
  );
};

export const ResourceField: FC<ResourceProps> = ({
  id,
  readOnly,
  resourceTypes,
  required,
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
    register(id, { required });
  });

  return (
    <Dropdown
      size={"xs"}
      className="max-h-[50vh] overflow-y-auto"
      id={id}
      color={"purple"}
      disabled={readOnly}
      label={
        watchValue?.length
          ? NodeId.fromId(watchValue).name
          : "Select a resource"
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
  id,
  allowedValues,
  readOnly,
  required,
}) => {
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
    register(id, { required });
  });

  return (
    <Dropdown
      size={"xs"}
      className="max-h-[50vh] overflow-y-auto"
      id={id}
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
  );
};
