import axios from "axios";
import {
  deriveDisplayName,
  parseProperties,
} from "../shared/resources/ResourceTypes";
import { ResourceTypeKB } from "../shared/resources/ResourceTypeKB";
import type { ArchitectureView } from "../shared/architecture/Architecture";
import type { ViewNodeType } from "../shared/architecture/Architecture";

export async function getResourceTypes(
  architectureId: string,
  idToken: string,
): Promise<ResourceTypeKB> {
  const { data } = await axios.get(
    `/api/architecture/${architectureId}/resource_types`,
    {
      headers: {
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
    },
  );

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
}
