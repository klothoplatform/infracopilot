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
import { Button, Card } from "flowbite-react";
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

  // todo: configure default values -- needs all properties, not just those from the architecture file
  const methods = useForm({
    defaultValues: selectedResource
      ? toFormState(
          architecture.resources.get(selectedResource.toKlothoIdString()),
          resourceType?.properties,
        )
      : {},
  });
  const formState = methods.formState;
  const getFieldState = methods.getFieldState;

  const { dirtyFields, touchedFields, isDirty, defaultValues } = formState;

  const submitConfigChanges: SubmitHandler<any> = useCallback(
    async (e: any) => {
      console.log(e);
      console.log(getFieldState("Image"));
      console.log(formState);
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
      formState,
      configureResources,
      dirtyFields,
      resourceType,
      selectedResource,
      touchedFields,
      getFieldState,
    ],
  );

  return (
    <>
      {resourceType?.properties?.length && (
        <FormProvider {...methods}>
          <div className={"w-full"}>
            <form onSubmit={methods.handleSubmit(submitConfigChanges)}>
              <Card className="max-h-[50vh]] overflow-auto py-2">
                <div className="max-h-[50vh] overflow-auto [&>*:not(:last-child)]:mb-2">
                  <ConfigGroup fields={resourceType.properties} />
                </div>
              </Card>
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
      } else if (field.type === CollectionTypes.List) {
        formState[key] = value.map((item: any) => {
          if ((field as ListProperty).itemType === CollectionTypes.Map) {
            return toFormState(item, field.properties);
          }
          return item;
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
      } else if (field.type === CollectionTypes.List) {
        metadata[key] = value.map((item: any) => {
          if ((field as ListProperty).itemType === CollectionTypes.Map) {
            return toMetadata(item, field.properties);
          }
          return item;
        });
      } else {
        metadata[key] = value;
      }
    }
  });
  return metadata;
}
