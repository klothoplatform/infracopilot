"use client";

import type {
  ListProperty,
  MapProperty,
  Property,
  ResourceType,
} from "../../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  isCollection,
} from "../../shared/resources/ResourceTypes";
import { Button } from "flowbite-react";
import type { SubmitHandler } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import React, { useCallback, useEffect } from "react";

import useApplicationStore from "../../views/store/ApplicationStore";
import {
  getCustomConfigSections,
  getCustomConfigState,
} from "../../views/ArchitectureEditor/config/CustomConfigMappings";
import type { Constraint } from "../../shared/architecture/Constraints";
import {
  ConstraintOperator,
  ResourceConstraint,
} from "../../shared/architecture/Constraints";
import { ConfigGroup } from "../config/ConfigGroup";
import type { NodeId } from "../../shared/architecture/TopologyNode";

export default function ConfigForm() {
  const {
    selectedResource,
    resourceTypeKB,
    architecture,
    applyConstraints,
    addError,
  } = useApplicationStore();

  let resourceType: ResourceType | undefined;
  if (selectedResource) {
    resourceType = resourceTypeKB.getResourceType(
      selectedResource.provider,
      selectedResource.type,
    );
  }

  const methods = useForm({
    defaultValues: selectedResource
      ? {
          ...toFormState(
            architecture.resources.get(selectedResource.toString()),
            resourceType?.properties,
          ),
          ...getCustomConfigState(selectedResource, architecture),
        }
      : {},
  });
  const formState = methods.formState;
  const { defaultValues, dirtyFields, isSubmitSuccessful } = formState;

  useEffect(() => {
    if (!isSubmitSuccessful) {
      return;
    }

    methods.reset(
      selectedResource
        ? {
            ...toFormState(
              architecture.resources.get(selectedResource.toString()),
              resourceType?.properties,
            ),
            ...getCustomConfigState(selectedResource, architecture),
          }
        : {},
    );
  }, [
    architecture,
    isSubmitSuccessful,
    methods,
    resourceType,
    selectedResource,
  ]);

  const submitConfigChanges: SubmitHandler<any> = useCallback(
    async (submittedValues: any) => {
      if (!selectedResource) {
        return;
      }

      console.log("submitting config changes");

      const modifiedFormFields = getModifiedFormFields(
        submittedValues,
        defaultValues,
        dirtyFields,
        resourceType?.properties,
      );

      const modifiedRootProperties = Object.fromEntries(
        [...modifiedFormFields.keys()].map((key) => {
          const rootKey = key.split(".", 2)[0].replaceAll(/\[\d+]/g, "");
          const value = submittedValues[rootKey];
          return [rootKey, value];
        }),
      );

      const constraints: Constraint[] = Object.entries(
        toMetadata(modifiedRootProperties, resourceType?.properties) as any,
      ).map(([key, value]): ResourceConstraint => {
        return new ResourceConstraint(
          ConstraintOperator.Equals,
          selectedResource,
          key,
          value,
        );
      });

      constraints.push(...applyCustomizers(selectedResource, submittedValues));

      if (!constraints.length) {
        return;
      }
      await applyConstraints(constraints);
    },
    [
      addError,
      applyConstraints,
      defaultValues,
      dirtyFields,
      resourceType?.properties,
      selectedResource,
    ],
  );

  return (
    <>
      {(resourceType?.properties?.length ?? 0) > 0 && (
        <FormProvider {...methods}>
          <form
            className="flex h-full w-full flex-col"
            onSubmit={methods.handleSubmit(submitConfigChanges)}
          >
            <div className="w-full basis-[calc(100%-3rem)] overflow-auto pb-6 [&>*:not(:last-child)]:mb-2">
              <ConfigGroup fields={resourceType?.properties} />
              {selectedResource &&
                Object.entries(
                  getCustomConfigSections(
                    selectedResource.provider,
                    selectedResource.type,
                  ),
                ).map((entry, index) => {
                  const Component = entry[1].component;
                  return Component ? <Component key={index} /> : null;
                })}
            </div>
            <Button type="submit" color="purple" className="my-2 w-full">
              Apply Changes
            </Button>
          </form>
        </FormProvider>
      )}
    </>
  );
}

function toFormState(metadata: any, fields: Property[] = []) {
  const formState: any = {};
  if (!metadata) {
    return formState;
  }
  fields = fields.filter(
    (field) => !field.deployTime && !field.configurationDisabled,
  );
  Object.keys(metadata).forEach((key) => {
    const value = metadata[key];
    const field = fields.find((field) => field.name === key);
    if (field) {
      if (field.type === CollectionTypes.Map) {
        if (isCollection((field as MapProperty).valueType)) {
          formState[key] = toFormState(value, field.properties);
        } else {
          formState[key] = Object.entries(value).map(([key, value]) => {
            return { key, value };
          });
        }
      } else if (
        field.type === CollectionTypes.List ||
        field.type === CollectionTypes.Set
      ) {
        formState[key] = value.map((value: any) => {
          switch ((field as ListProperty).itemType) {
            case CollectionTypes.Map:
              return toFormState(value, field.properties);
            case CollectionTypes.Set:
            case CollectionTypes.List:
              return toFormState(value, field.properties);
            default:
              return { value };
          }
        });
      } else {
        formState[key] = value;
      }
    }
  });
  return formState;
}

function toMetadata(formState: any, fields: Property[] = []) {
  if (!formState) {
    return {};
  }

  const metadata: any = {};
  fields = fields.filter(
    (field) => !field.deployTime && !field.configurationDisabled,
  );
  Object.keys(formState).forEach((key) => {
    const value = formState[key];
    const field = fields.find((field) => field.name === key);
    if (field) {
      if (field.type === CollectionTypes.Map) {
        if (isCollection((field as MapProperty).valueType)) {
          metadata[key] = toMetadata(value, field.properties);
        } else {
          metadata[key] = Object.fromEntries(
            value.map((item: any) => {
              return [item.key, item.value];
            }),
          );
        }
      } else if (
        field.type === CollectionTypes.List ||
        field.type === CollectionTypes.Set
      ) {
        metadata[key] = value?.map((item: any) => {
          if ((field as ListProperty).itemType === CollectionTypes.Map) {
            return toMetadata(item, field.properties);
          }
          return item.value;
        });
      } else {
        metadata[key] = value;
      }
    }
  });
  return metadata;
}

function applyCustomizers(resourceId: NodeId, state: any): Constraint[] {
  const sections = getCustomConfigSections(
    resourceId.provider,
    resourceId.type,
  );

  if (!sections) {
    return [];
  }

  const constraints: Constraint[] = [];
  Object.entries(state).forEach(([key, value]) => {
    if (sections[key]?.stateHandler) {
      constraints.push(
        ...(sections[key]?.stateHandler?.(value, resourceId) ?? []),
      );
    }
  });
  return constraints;
}

/**
 getModifiedFormFields returns a map of qualified field name to value of all form fields that have been modified from their default values.
 each entry represents the deepest nested field that has been modified.
 only fields that are either primitive types or have primitive value/item types are considered.
 the qualified field name is the dot-separated path to the field from the root of the form. List and Set items are indexed by their position in the collection.
 the value is the primitive nested value of the field. if the field is a collection, the value is the nested value of the first item.

 e.g. for the following form fields:
 {
 "a": 1,
 "b": {
 "c": 2,
 "d": [
 {
 "e": 3,
 "f": 4
 }
 ],
 "g": {
 "h": 5,
 "i": 6
 }
 },
 }
 }

 returns the following map:
 {
 "a": 1,
 "b.c": 2,
 "b.d[0].e": 3,
 "b.d[0].f": 4,
 "b.g.h": 5,
 "b.g.i": 6
 }

 */
function getModifiedFormFields(
  formFields: any,
  defaultValues: any,
  dirtyFields: any,
  resourceFields: Property[] = [],
  parentKey?: string,
): Map<string, any> {
  const modifiedFormFields = new Map<string, any>();
  Object.keys(dirtyFields).forEach((key) => {
    const fieldValue = formFields?.[key];
    const defaultValue = defaultValues?.[key];
    const dirtyField = dirtyFields?.[key];
    const resourceField = resourceFields.find(
      (field) => field.name === key.replaceAll(/\[\d+]/g, ""),
    );
    const qualifiedKey = parentKey ? `${parentKey}.${key}` : key;
    if (!resourceField) {
      return;
    }
    // ignore non-dirty fields
    if (!dirtyField || (Array.isArray(dirtyField) && !dirtyField.length)) {
      return;
    }

    if (resourceField.type === CollectionTypes.Map) {
      if (isCollection((resourceField as MapProperty).valueType)) {
        getModifiedFormFields(
          fieldValue,
          defaultValue,
          dirtyField,
          resourceField.properties,
          qualifiedKey,
        ).forEach((value, key) => {
          modifiedFormFields.set(key, value);
        });
      } else {
        dirtyField.forEach((item: any, index: number) => {
          if (!item?.["key"] && !item?.["value"]) {
            return;
          }
          modifiedFormFields.set(`${qualifiedKey}[${index}]`, {
            key: fieldValue[index]?.["key"],
            value: fieldValue[index]?.["value"],
          });
        });
      }
    } else if (
      resourceField.type === CollectionTypes.List ||
      resourceField.type === CollectionTypes.Set
    ) {
      if (isCollection((resourceField as ListProperty).itemType)) {
        dirtyField.forEach((item: any, index: number) => {
          getModifiedFormFields(
            fieldValue?.[index],
            defaultValue?.[index],
            dirtyField[index],
            resourceField.properties,
            `${qualifiedKey}[${index}]`,
          ).forEach((value, key) => {
            modifiedFormFields.set(key, value);
          });
        });
      } else {
        dirtyField.forEach((item: any, index: number) => {
          if (!item?.["value"]) {
            return;
          }
          modifiedFormFields.set(`${qualifiedKey}[${index}]`, {
            value: fieldValue[index]?.["value"],
          });
        });
      }
    } else {
      modifiedFormFields.set(qualifiedKey, fieldValue);
    }
  });
  return modifiedFormFields;
}
