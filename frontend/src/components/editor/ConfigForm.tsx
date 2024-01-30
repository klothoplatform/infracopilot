"use client";
import { trackError } from "../../pages/store/ErrorStore";

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

import useApplicationStore from "../../pages/store/ApplicationStore";
import {
  getCustomConfigSections,
  getCustomConfigState,
} from "../../pages/ArchitectureEditor/config/CustomConfigMappings";
import { type Constraint, removeEmptyKeys } from "../../shared/architecture/Constraints";
import {
  ConstraintOperator,
  ResourceConstraint,
} from "../../shared/architecture/Constraints";
import { ConfigGroup } from "../config/ConfigGroup";
import { NodeId } from "../../shared/architecture/TopologyNode";
import { analytics } from "../../App";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../FallbackRenderer";
import { ApplicationError, UIError } from "../../shared/errors";
import { ConfigSection } from "../config/ConfigSection";
import {
  type EnvironmentVersion,
  isPropertyPromoted,
  resourceProperties,
} from "../../shared/architecture/EnvironmentVersion";
import { type ConfigurationError } from "../../shared/architecture/Architecture";
import { get } from "http";
import { sub } from "date-fns";

interface ConfigFormSection {
  title: string;
  propertyMap: Map<string, Property[]>
}

interface ConfigFormProps {
  sections?: ConfigFormSection[];
  remainingProperties?: Property[];
}

export default function ConfigForm({
  sections,
  remainingProperties,
}: ConfigFormProps) {
  const {
    selectedResource,
    resourceTypeKB,
    environmentVersion,
    applyConstraints,
    addError,
    deselectResource,
  } = useApplicationStore();


  const getSectionsState = (sections?: ConfigFormSection[]) => {
    if (!sections) {
      return {};
    }
    let stateMap: {[key: string]: {}} = {}
    sections.forEach((section) => {
      return section.propertyMap.forEach((properties, resourceId): any => {
          const fs = toFormState(
            environmentVersion.resources.get(resourceId),
            properties,
            resourceId,
          );
          Object.keys(fs).forEach((key) => {
            console.log(key)
              stateMap[key] = fs[key]
          })
        });

      })
      console.log(stateMap, "stteMap")
      return stateMap
  }

  console.log(selectedResource,"selectedResource")

  const state = getSectionsState(sections)
  console.log(state, "state")
  if (selectedResource) {
  const defaults = {
    ...getSectionsState(sections),
    ...toFormState(
      environmentVersion.resources.get(selectedResource.toString()),
      remainingProperties,
      selectedResource, // remaining properties are always on the selected resource
    ),
    ...getCustomConfigState(selectedResource, environmentVersion),
  }
  console.log("defaults", defaults)
}

  const methods = useForm({
    shouldFocusError: true,
    defaultValues:
      !selectedResource ?
        {
          ...getSectionsState(sections),
        } :
         {
            ...getSectionsState(sections),
            ...toFormState(
              environmentVersion.resources.get(selectedResource.toString()),
              remainingProperties,
              selectedResource, // remaining properties are always on the selected resource
            ),
            ...getCustomConfigState(selectedResource, environmentVersion),
          }
  });

  console.log(environmentVersion, "environmentVersion", "config form")
  console.log(methods.getValues(), "methods.getValues()")
  console.log(methods.formState.defaultValues, "methods.formState.defaultValues")
   
  const formState = methods.formState;
  const {
    defaultValues,
    dirtyFields,
    isSubmitted,
    isSubmitSuccessful,
    isDirty,
    errors,
  } = formState;
  const [configErrors, setConfigErrors] = React.useState<ConfigurationError[]>(
    [],
  );

  // add errors to the fields which failed server side validation
  const { selectedNode } = useApplicationStore();

  useEffect(() => {
    const allSectionResources = sections?.map((section) => {
      return [...section.propertyMap.keys()]
    }).flat()
    configErrors?.forEach((e) => {
      if (
        e.resource.toString() === selectedNode ||
        allSectionResources?.includes(e.resource.toString())
      ) {
        methods.setError(`${e.resource}#${e.property}`, {
          message: e.error,
          type: "manual",
        });
      }
    });
  }, [
    configErrors,
    errors,
    methods,
    sections,
    selectedNode,
    selectedResource,
  ]);

  useEffect(() => {
    console.log("HHHOOO in use effect", selectedResource)
    if (isSubmitted && !isSubmitSuccessful) {
      console.log("returning")
      return;
    }
    if (sections && selectedResource) {
        methods.reset(
          {
            ...getSectionsState(sections),
            ...toFormState(
              environmentVersion.resources.get(selectedResource.toString()),
              remainingProperties,
              selectedResource, // remaining properties are always on the selected resource
            ),
            ...getCustomConfigState(selectedResource, environmentVersion),
          }
        )
    } else if (sections) {
      console.log("resetting")
      methods.reset(
        {
          ...getSectionsState(sections),
        }
      )
    } else if (selectedResource) {
      console.log("resetting")
      methods.reset(
        {
          ...toFormState(
            environmentVersion.resources.get(selectedResource.toString()),
            remainingProperties,
            selectedResource, // remaining properties are always on the selected resource
          ),
          ...getCustomConfigState(selectedResource, environmentVersion),
        }
      )
    }
  const allSectionResources = sections?.map((section) => {
    return [...section.propertyMap.keys()]
  }).flat()
  configErrors?.forEach((e) => {
    if (
      e.resource.toString() === selectedNode ||
      allSectionResources?.includes(e.resource.toString())
    ) {
      methods.setError(`${e.resource}#${e.property}`, {
        message: e.error,
        type: "manual",
      });
    }
  });
  }, [
    environmentVersion,
    isSubmitSuccessful,
    isSubmitted,
    methods,
    sections,
    selectedResource,
  ]);

  const submitConfigChanges: SubmitHandler<any> = useCallback(
    async (submittedValues: any) => {
      console.log(submittedValues, "submittedValues")
      const valuesByResource = new Map<string, { values: any; dirty: any }>();
      for (let [key, value] of Object.entries(submittedValues)) {
        const resourceId = NodeId.parse(key.split("#", 2)[0]);
        const res = valuesByResource.get(resourceId.toString()) ?? {
          values: {},
          dirty: {},
        };
        res.values[key] = value;
        res.dirty[key] = dirtyFields[key];
        valuesByResource.set(resourceId.toString(), res);
      }

      let constraints: Constraint[] = [];
      try {
        for (const [resourceIdStr, { values, dirty }] of valuesByResource) {
          const resourceId = NodeId.parse(resourceIdStr);
          const resourceType = resourceTypeKB.getResourceType(
            resourceId.provider,
            resourceId.type,
          );
          const modifiedFormFields = getModifiedFormFields(
            values,
            { ...defaultValues },
            dirty,
            resourceId,
            resourceType?.properties,
          );

          console.log(values)
          const non_empty_values = removeEmptyKeys(values);
          console.log(non_empty_values)
          const modifiedRootProperties = Object.fromEntries(
            [...modifiedFormFields.keys()].map((key) => {
              const rootKey = key.split(".", 2)[0].replaceAll(/\[\d+]/g, "");
              const value = non_empty_values[rootKey];
              return [rootKey, value];
            }),
          );

          console.log(modifiedRootProperties)
          const resConstraints: Constraint[] = Object.entries(
            toResourceMetadata(
              modifiedRootProperties,
              resourceType?.properties,
            ) as any,
          )
            .filter(
              ([key]) =>
                !resourceType?.properties?.find((field) => field.name === key)
                  ?.synthetic,
            )
            .map(([key, value]): ResourceConstraint => {
              return new ResourceConstraint(
                ConstraintOperator.Equals,
                resourceId,
                key.split("#", 2)[1] ?? key,
                value,
              );
            });

          if (selectedResource) {
            if (resourceId.equals(selectedResource)) {
              resConstraints.push(
                ...applyCustomizers(
                  selectedResource,
                  values,
                  { ...defaultValues },
                  modifiedFormFields,
                  environmentVersion,
                ),
              );
            }
          }
          constraints.push(...resConstraints);
        }
      } catch (e: any) {
        console.error(e);
        addError(
          new UIError({
            errorId: "ConfigForm:SubmitConfigChanges",
            message: "Failed to submit config changes!",
            cause: e,
          }),
        );
      }

      analytics.track("configureResource", {
        configure: {
          constraints: constraints,
        },
      });

      if (!constraints.length) {
        return;
      }
      try {
        const currConfigErrs = await applyConstraints(constraints);
        setConfigErrors(currConfigErrs);
      } catch (e: any) {
        if (e instanceof ApplicationError) {
          addError(e);
        } else {
          addError(
            new UIError({
              errorId: "ConfigForm:ApplyConstraints",
              message: "Failed to apply constraints!",
              data: { error: e.message },
            }),
          );
        }
      }
    },
    [
      addError,
      applyConstraints,
      environmentVersion,
      defaultValues,
      dirtyFields,
      resourceTypeKB,
      selectedResource,
    ],
  );

  const configSections =  sections?.map((section) => {
    return (
      <ConfigSection
      key={section.title}
      id={section.title}
      title={section.title}
      removable={false}
      defaultOpened={true}
    >
      {selectedResource &&
        Object.entries(
          getCustomConfigSections(
            selectedResource.provider,
            selectedResource.type,
          ),
        ).map((entry, index) => {
          const Component = entry[1].component;
          return Component ? (
            <Component
              key={index}
              configResource={selectedResource}
              resource={environmentVersion.resources.get(
                selectedResource.toString(),
              )}
            />
          ) : null;
        })}
      {section.propertyMap &&
        [...section.propertyMap.entries()].map(
          ([resourceId, properties]) => {
            if (resourceId === selectedResource?.toString()) {
              return (
                <ConfigGroup
                  key={resourceId}
                  configResource={NodeId.parse(resourceId)}
                  fields={properties}
                />
              );
            } else {
              return (
                <ConfigSection
                  key={resourceId.toString()}
                  id={resourceId.toString()}
                  title={resourceId.toString()}
                >
                  <ConfigGroup
                    configResource={NodeId.parse(resourceId)}
                    fields={properties}
                  />
                </ConfigSection>
              );
            }
          },
        )}
    </ConfigSection>
    )
  })



  return (
    <ErrorBoundary
      onError={(error, info) =>
        trackError(
          new UIError({
            message: "uncaught error in ConfigForm",
            errorId: "ConfigForm:ErrorBoundary",
            cause: error,
            data: { info },
          }),
        )
      }
      fallbackRender={FallbackRenderer}
    >
      {sections?.length && (
        <FormProvider {...methods}>
          <form
            className="flex h-full min-h-0 w-full flex-col justify-between"
            onSubmit={methods.handleSubmit(submitConfigChanges)}
          >
            <div className="mb-2 max-h-full min-h-0 w-full overflow-y-auto overflow-x-hidden pb-2 [&>*:not(:last-child)]:mb-2">
              {configSections ?? null}
              {remainingProperties?.length && (
                <ConfigSection
                  id="remaining"
                  title="more properties"
                  removable={false}
                  defaultOpened={false}
                >
                  <ConfigGroup
                    configResource={selectedResource!}
                    fields={remainingProperties}
                  />
                </ConfigSection>
              )}
            </div>
            {isDirty && (
              <div className="flex flex-col gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                <div className="flex justify-end gap-2">
                  <Button
                    outline
                    color=""
                    onClick={() => deselectResource(selectedResource)}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" color="purple">
                    Save
                  </Button>
                </div>
              </div>
            )}
          </form>
        </FormProvider>
      )}
    </ErrorBoundary>
  );
}

function toFormState(
  metadata: any,
  fields: Property[] = [],
  resourceId?: NodeId | string,
) {
  const formState: any = {};
  if (!metadata) {
    return formState;
  }

  const props = new Set([
    ...Object.keys(metadata),
    ...fields.map((f) => f.name),
  ]);

  props.forEach((property) => {
    let key = property;
    if (resourceId) {
      key = `${resourceId}#${property}`;
    }

    const value = metadata[property];
    const field = fields.find((field) => field.name === property);
    switch (field?.type) {
      case CollectionTypes.Map:
        if (!value) {
          formState[key] = [];
        } else if (isCollection((field as MapProperty).valueType)) {
          formState[key] = toFormState(value, field.properties);
        } else {
          formState[key] = Object.entries(value).map(([key, value]) => {
            return { key, value };
          });
        }
        break;
      case CollectionTypes.Set:
      case CollectionTypes.List:
        if (!value) {
          formState[key] = [];
          break;
        }
        formState[key] = value.map((value: any) => {
          if (isCollection((field as ListProperty).itemType)) {
            const inner = toFormState(value, field.properties);
            return Object.fromEntries(
              Object.entries(inner).map(([key, value]) => {
                // remove the resource id prefix from the key for nested fields
                return [key, value];
              }),
            );
          }
          return { value };
        });
        break;
      default:
        if (field) {
          formState[key] = value ?? null;
        }
    }
  });
  return formState;
}

function toResourceMetadata(formState: any, fields: Property[] = []) {
  if (!formState) {
    return {};
  }

  const metadata: any = {};
  fields = fields.filter(
    (field) =>
      !field.deployTime && !field.configurationDisabled && !field.synthetic,
  );

  Object.keys(formState).forEach((rawKey) => {
    const key = rawKey.includes("#") ? rawKey.split("#", 2)[1] : rawKey;
    const value = formState[rawKey];
    const field = fields.find((field) => field.name === key);
    switch (field?.type) {
      case CollectionTypes.Map:
        if (isCollection((field as MapProperty).valueType)) {
          metadata[key] = toResourceMetadata(value, field.properties);
        } else {
          metadata[key] = Object.fromEntries(
            value.map((item: any) => {
              return [item.key, item.value];
            }),
          );
        }
        break;
      case CollectionTypes.Set:
      case CollectionTypes.List:
        metadata[key] = value.map((item: any) => {
          if (isCollection((field as ListProperty).itemType)) {
            return toResourceMetadata(item, field.properties);
          }
          return item.value;
        });
        break;
      default:
        metadata[key] = value;
    }
  });
  return metadata;
}

function applyCustomizers(
  resourceId: NodeId,
  submittedValues: any,
  defaultValues: any,
  modifiedValues: Map<string, any>,
  environmentVersion: EnvironmentVersion,
): Constraint[] {
  const sections = getCustomConfigSections(
    resourceId.provider,
    resourceId.type,
  );

  if (!sections) {
    return [];
  }

  const constraints: Constraint[] = [];
  Object.entries(submittedValues).forEach(([key, value]) => {
    if (!key.startsWith(`${resourceId}#`)) {
      return;
    }
    const prop = key.split("#", 2)[1];
    const handler = sections[prop]?.stateHandler;
    if (handler) {
      constraints.push(
        ...(handler(
          submittedValues,
          defaultValues,
          modifiedValues,
          resourceId,
          environmentVersion,
        ) ?? []),
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
 */
function getModifiedFormFields(
  formFields: any,
  defaultValues: any,
  dirtyFields: any,
  configResource: NodeId | string,
  resourceFields: Property[] = [],
  parentKey?: string,
): Map<string, any> {
  const modifiedFormFields = new Map<string, any>();
  Object.keys(dirtyFields).forEach((key) => {
    const prop = key.split("#", 2)[1] ?? key;
    const fieldValue = formFields?.[key];
    const defaultValue = defaultValues?.[key];
    const dirtyField = dirtyFields?.[key];
    const resourceField = resourceFields.find(
      (field) => field.name === prop.replaceAll(/\[\d+]/g, ""),
    );
    const qualifiedKey = parentKey ? `${parentKey}.${prop}` : key;
    if (!resourceField) {
      return;
    }
    if (fieldValue === undefined) {
      modifiedFormFields.set(qualifiedKey, undefined);
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
          configResource,
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
        dirtyField.forEach((_: any, index: number) => {
          const indexValue = fieldValue?.[index];
          if (indexValue === undefined) {
            modifiedFormFields.set(`${qualifiedKey}[${index}]`, undefined);
          }

          getModifiedFormFields(
            fieldValue?.[index],
            defaultValue?.[index],
            dirtyField[index],
            configResource,
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
