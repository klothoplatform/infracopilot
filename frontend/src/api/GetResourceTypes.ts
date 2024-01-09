import type { AxiosResponse } from "axios";
import axios from "axios";
import {
  deriveDisplayName,
  parseProperties,
} from "../shared/resources/ResourceTypes";
import { ResourceTypeKB } from "../shared/resources/ResourceTypeKB";
import type {
  ArchitectureView,
  ViewNodeType,
} from "../shared/architecture/Architecture";
import { ApiError, ApplicationError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";

export async function getResourceTypes(
  architectureId: string,
  environment: string,
  idToken: string,
): Promise<ResourceTypeKB> {
  let response: AxiosResponse;
  try {
    response = await axios.get(
      `/api/architecture/${architectureId}/environment/${environment}/resource_types`,
      {
        headers: {
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
      },
    );
  } catch (e: any) {
    const error = new ApiError({
      errorId: "GetResourceTypes",
      message: "An error occurred while getting resource types.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
      data: {
        architectureId,
        environment,
      },
    });
    trackError(error);
    throw error;
  }

  const { data } = response;

  try {
    const resourceTypes = new ResourceTypeKB();
    for (const resourceType of Object.keys(data)) {
      const [provider, type] = resourceType.split(":", 2);
      const resourceInfo = data[resourceType];
      const views = new Map<ArchitectureView, ViewNodeType>(
        Object.entries(resourceInfo.views ?? {}) as [
          ArchitectureView,
          ViewNodeType,
        ][],
      );

      resourceTypes.addResourceType({
        provider: provider,
        type: type,
        classifications: resourceInfo.classifications,
        properties: parseProperties(resourceInfo.properties),
        displayName: resourceInfo.displayName
          ? resourceInfo.displayName
          : deriveDisplayName(type),
        views: views,
      });
    }
    console.log("resourceTypes", resourceTypes);
    return resourceTypes;
  } catch (e: any) {
    throw new ApplicationError({
      message: "Failed to parse resource types",
      errorId: "GetResourceTypes",
      data: data,
      cause: e,
    });
  }
}
