"use client";

import type { ResourceConfigurationRequest } from "../views/store/EditorStore";
import type {
  ListProperty,
  MapProperty,
  Property,
  ResourceType,
} from "../shared/resources/ResourceTypes";
import {
  CollectionTypes,
  isCollection,
} from "../shared/resources/ResourceTypes";
import { Button } from "flowbite-react";
import type { SubmitHandler } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import React, { useCallback } from "react";
import useApplicationStore from "../views/store/ApplicationStore";
import { ConfigGroup } from "./config/ConfigGroup";
import type { NodeId } from "../shared/architecture/TopologyNode";

export default function ConfigForm() {
  const { selectedResource, resourceTypeKB, architecture, configureResources } =
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
      ? toFormState(
          architecture.resources.get(selectedResource.toKlothoIdString()),
          resourceType?.properties,
        )
      : {},
  });
  const formState = methods.formState;

  const { dirtyFields, touchedFields } = formState;

  const submitConfigChanges: SubmitHandler<any> = useCallback(
    async (e: any) => {
      console.log(e);
      console.log(dirtyFields);
      console.log(touchedFields);
      const configRequests = Object.entries(
        toMetadata(e, resourceType?.properties) as any,
      )
        .map(([key, value]) => {
          return {
            property: key,
            value: value,
            modified: dirtyFields[key] || touchedFields[key],
          };
        })
        .filter((prop) => prop.modified)
        .map((prop): ResourceConfigurationRequest => {
          return {
            resourceId: selectedResource as NodeId,
            property: prop.property,
            value: prop.value,
          };
        });
      console.log(configRequests);
      if (!configRequests.length) {
        return;
      }
      await configureResources(configRequests);
    },
    [
      configureResources,
      dirtyFields,
      resourceType,
      selectedResource,
      touchedFields,
    ],
  );

  return (
    <>
      {resourceType?.properties?.length && (
        <FormProvider {...methods}>
          <div className={"w-full pt-2"}>
            <form onSubmit={methods.handleSubmit(submitConfigChanges)}>
              <div className="h-[50vh] max-h-[50vh] overflow-auto [&>*:not(:last-child)]:mb-2">
                <ConfigGroup fields={resourceType.properties} />
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
        metadata[key] = value.map((item: any) => {
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
