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
import type { Constraint } from "../../shared/architecture/Constraints";
import {
  ConstraintOperator,
  ResourceConstraint,
} from "../../shared/architecture/Constraints";
import { ConfigGroup } from "../config/ConfigGroup";
import type { NodeId } from "../../shared/architecture/TopologyNode";
import { resourceProperties, type Architecture, type ConfigurationError, isPropertyPromoted } from "../../shared/architecture/Architecture";
import { analytics } from "../../App";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../FallbackRenderer";
import { ApplicationError, UIError } from "../../shared/errors";
import { ConfigSection } from "../config/ConfigSection";

export default function ConfigForm() {
  const {
    selectedResource,
    resourceTypeKB,
    architecture,
    applyConstraints,
    addError,
  } = useApplicationStore();

  let resourceType: ResourceType | undefined;
  let promotedProperties: Map<NodeId, Property[]> | undefined;
  let remainingProperties: Map<NodeId, Property[]> | undefined;
  if (selectedResource) {
    resourceType = resourceTypeKB.getResourceType(
      selectedResource.provider,
      selectedResource.type,
    );

    const allProperties = resourceProperties(architecture, resourceTypeKB, selectedResource);
    promotedProperties = new Map<NodeId, Property[]>();
    remainingProperties = new Map<NodeId, Property[]>();
    for (const [resourceId, properties] of allProperties) {
      const promotedProps = properties.filter(p => isPropertyPromoted(p));
      if (promotedProps.length > 0) {
        promotedProperties.set(
          resourceId,
          promotedProps,
        );
      }
      const remainingProps = properties.filter(p => !promotedProps.includes(p));
      if (remainingProps.length > 0) {
        remainingProperties.set(
          resourceId,
          remainingProps,
        );
      }
    }
    if (promotedProperties.size === 0) {
      promotedProperties = remainingProperties;
      remainingProperties = undefined;
    }
    if (remainingProperties?.size === 0) {
      remainingProperties = undefined;
    }
  }

  const methods = useForm({
    shouldFocusError: true,
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
  if (configErrors) {
    configErrors.forEach((e) => {
      if (e.resource.toString() === selectedNode) {
        errors[e.property] = {
          message: e.error,
          type: "manual",
        };
      }
    });
  }
  useEffect(() => {
    if (isSubmitted && !isSubmitSuccessful) {
      return;
    }

    console.log(defaultValues, dirtyFields, isSubmitted, isSubmitSuccessful);
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
    isSubmitted,
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
      let constraints: Constraint[] = [];
      try {
        const modifiedFormFields = getModifiedFormFields(
          submittedValues,
          { ...defaultValues },
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

        constraints = Object.entries(
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
              selectedResource,
              key,
              value,
            );
          });

        constraints.push(
          ...applyCustomizers(
            selectedResource,
            submittedValues,
            { ...defaultValues },
            modifiedFormFields,
            architecture,
          ),
        );
      } catch (e: any) {
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
          resourceId: selectedResource.toString(),
          constraints: constraints,
        },
      });

      if (!constraints.length) {
        return;
      }
      try {
        const currConfigErrs = await applyConstraints(constraints);
        console.log("currConfigErrs", currConfigErrs);
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
      architecture,
      defaultValues,
      dirtyFields,
      resourceType?.properties,
      selectedResource,
    ],
  );

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
      {promotedProperties?.size && (
        <FormProvider {...methods}>
          <form
            className="flex h-full min-h-0 w-full flex-col justify-between"
            onSubmit={methods.handleSubmit(submitConfigChanges)}
          >
            <div className="mb-2 max-h-full min-h-0 w-full overflow-y-auto overflow-x-hidden pb-2 [&>*:not(:last-child)]:mb-2">
                <ConfigSection id="promoted" title="Properties" removable={false} defaultOpened={true}>
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
                    <ConfigGroup selectedResource={selectedResource!} fields={promotedProperties} />
                </ConfigSection>
                {remainingProperties?.size && (
                    <ConfigSection id="remaining" title="more properties" removable={false} defaultOpened={false}>
                        <ConfigGroup selectedResource={selectedResource!} fields={remainingProperties} />
                    </ConfigSection>
                )}
            </div>
            {isDirty && (
              <Button type="submit" color="purple" fullSized={true}>
                Apply Changes
              </Button>
            )}
          </form>
        </FormProvider>
      )}
    </ErrorBoundary>
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

  const keys = [
    ...new Set([
      ...Object.keys(metadata),
      ...fields.map((f) => f.name),
    ]).values(),
  ].sort();

  keys.forEach((key) => {
    const value = metadata[key];
    const field = fields.find((field) => field.name === key);
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
            return toFormState(value, field.properties);
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

  Object.keys(formState).forEach((key) => {
    const value = formState[key];
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
  architecture: Architecture,
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
    if (sections[key]?.stateHandler) {
      constraints.push(
        ...(sections[key]?.stateHandler?.(
          submittedValues,
          defaultValues,
          modifiedValues,
          resourceId,
          architecture,
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

 @formatter:off

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
