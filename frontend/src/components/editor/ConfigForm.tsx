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
  const { selectedResource, resourceTypeKB, architecture, applyConstraints } =
    useApplicationStore();

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
            architecture.resources.get(selectedResource.toKlothoIdString()),
            resourceType?.properties,
          ),
          ...getCustomConfigState(selectedResource, architecture),
        }
      : {},
  });
  const formState = methods.formState;
  const { dirtyFields, touchedFields, isSubmitSuccessful } = formState;

  useEffect(() => {
    if (!isSubmitSuccessful) {
      return;
    }

    methods.reset(
      selectedResource
        ? {
            ...toFormState(
              architecture.resources.get(selectedResource.toKlothoIdString()),
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
      console.log(submittedValues);
      console.log(dirtyFields);
      console.log(touchedFields);
      if (!selectedResource) {
        return;
      }

      const constraints: Constraint[] = Object.entries(
        toMetadata(submittedValues, resourceType?.properties) as any,
      )
        .map(([key, value]) => {
          return {
            property: key,
            value: value,
            modified: dirtyFields[key] || touchedFields[key],
          };
        })
        .filter((prop) => prop.modified)
        .map((prop): ResourceConstraint => {
          return new ResourceConstraint(
            ConstraintOperator.Equals,
            selectedResource,
            prop.property,
            prop.value,
          );
        });

      constraints.push(...applyCustomizers(selectedResource, submittedValues));

      console.log(constraints);
      if (!constraints.length) {
        return;
      }
      await applyConstraints(constraints);
    },
    [architecture, dirtyFields, resourceType, selectedResource, touchedFields],
  );

  return (
    <>
      {resourceType?.properties?.length && (
        <FormProvider {...methods}>
          <div className={"w-full pt-2"}>
            <form onSubmit={methods.handleSubmit(submitConfigChanges)}>
              <div className="h-[50vh] max-h-[50vh] overflow-auto [&>*:not(:last-child)]:mb-2">
                <ConfigGroup fields={resourceType.properties} />
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
          </div>
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
