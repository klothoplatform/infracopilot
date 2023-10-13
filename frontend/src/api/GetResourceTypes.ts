import axios from "axios";
import {
  deriveDisplayName,
  parseProperties,
} from "../shared/resources/ResourceTypes";
import { ResourceTypeKB } from "../shared/resources/ResourceTypeKB";

export async function getResourceTypes(
  architectureId: string,
): Promise<ResourceTypeKB> {
  const { data } = await axios.get(
    `/architecture/${architectureId}/resource_types`,
  );

  const resourceTypes = new ResourceTypeKB();
  for (const resourceType of Object.keys(data)) {
    const [provider, type] = resourceType.split(":", 2);
    const resourceInfo = data[resourceType];
    resourceTypes.addResourceType({
      provider: provider,
      type: type,
      classifications: resourceInfo.classifications,
      properties: parseProperties(resourceInfo.properties),
      displayName: resourceInfo.displayName
        ? resourceInfo.displayName
        : deriveDisplayName(type),
    });
  }
  console.log("resourceTypes", resourceTypes);
  return resourceTypes;
}
