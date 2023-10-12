import axios from "axios";
import type { IconMapping } from "../shared/reactflow/ResourceMappings";

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
      displayName: resourceInfo.displayName
        ? resourceInfo.displayName
        : deriveDisplayName(type),
    });
  }
  return resourceTypes;
}

function deriveDisplayName(type: string): string {
  return type
    .split("_")
    .map(
      ([firstChar, ...rest]) =>
        firstChar.toUpperCase() + rest.join("").toLowerCase(),
    )
    .join(" ");
}

export class ResourceTypeKB {
  resourceTypes: Map<string, ResourceType> = new Map();

  addResourceType(resourceType: ResourceType): void {
    this.resourceTypes.set(
      `${resourceType.provider}:${resourceType.type}`,
      resourceType,
    );
  }

  getResourceType(provider: string, type: string): ResourceType | undefined {
    return this.resourceTypes.get(`${provider}:${type}`);
  }

  getResourceTypes(filter?: ResourceTypeFilter): ResourceType[] {
    let resourceTypes = [...this.resourceTypes.values()];
    if (filter?.providers) {
      resourceTypes = resourceTypes.filter(
        (resourceType) => filter.providers?.includes(resourceType.provider),
      );
    }
    if (filter?.types) {
      resourceTypes = resourceTypes.filter(
        (resourceType) => filter.types?.includes(resourceType.type),
      );
    }
    if (filter?.classifications) {
      resourceTypes = resourceTypes.filter(
        (resourceType) =>
          resourceType.classifications?.some(
            (c) => filter.classifications?.includes(c),
          ),
      );
    }
    if (filter?.excludedProviders) {
      resourceTypes = resourceTypes.filter(
        (resourceType) =>
          !filter.excludedProviders?.includes(resourceType.provider),
      );
    }
    if (filter?.excludedTypes) {
      resourceTypes = resourceTypes.filter(
        (resourceType) => !filter.excludedTypes?.includes(resourceType.type),
      );
    }
    if (filter?.excludedClassifications) {
      resourceTypes = resourceTypes.filter(
        (resourceType) =>
          resourceType.classifications?.every(
            (c) => !filter.excludedClassifications?.includes(c),
          ),
      );
    }
    return resourceTypes.sort((a, b) => a.type.localeCompare(b.type));
  }
}

export interface ResourceType {
  provider: string;
  type: string;
  classifications?: string[];
  displayName: string;
  iconMapping?: IconMapping;
}

export interface ResourceTypeFilter {
  providers?: string[];
  types?: string[];
  classifications?: string[];
  excludedProviders?: string[];
  excludedTypes?: string[];
  excludedClassifications?: string[];
}
