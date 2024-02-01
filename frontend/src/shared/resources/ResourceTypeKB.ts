import type {
  Property,
  ResourceType,
  ResourceTypeFilter,
} from "./ResourceTypes";
import { customConfigMappings } from "../../pages/ArchitectureEditor/config/CustomConfigMappings";
import { ArchitectureView, ViewNodeType } from "../architecture/Architecture";

export class ResourceTypeKB {
  constructor(
    public resourceTypes: Map<string, ResourceType> = new Map<
      string,
      ResourceType
    >(),
  ) {
    resourceTypes.forEach((resourceType) => {
      this.addResourceType(resourceType);
    });
  }

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
      resourceTypes = resourceTypes.filter((resourceType) =>
        filter.providers?.includes(resourceType.provider),
      );
    }
    if (filter?.types) {
      resourceTypes = resourceTypes.filter((resourceType) =>
        filter.types?.includes(resourceType.type),
      );
    }
    if (filter?.classifications) {
      resourceTypes = resourceTypes.filter((resourceType) =>
        resourceType.classifications?.some((c) =>
          filter.classifications?.includes(c),
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
    if (filter?.excludedQualifiedTypes) {
      resourceTypes = resourceTypes.filter(
        (resourceType) =>
          !filter.excludedQualifiedTypes?.includes(
            `${resourceType.provider}:${resourceType.type}`,
          ),
      );
    }
    if (filter?.excludedClassifications) {
      resourceTypes = resourceTypes.filter((resourceType) =>
        resourceType.classifications?.every(
          (c) => !filter.excludedClassifications?.includes(c),
        ),
      );
    }
    if (filter?.iconSizes) {
      resourceTypes = resourceTypes.filter((resourceType) =>
        filter.iconSizes?.includes(
          resourceType.views.get(ArchitectureView.DataFlow) ??
            ViewNodeType.Small,
        ),
      );
    }
    return resourceTypes.sort((a, b) => a.type.localeCompare(b.type));
  }

  getImportFieldsForResourceType(
    provider: string,
    resourceType: string,
  ): Property[] {
    const rt = this.getResourceType(provider, resourceType);
    if (!rt) {
      throw new Error(`Resource type not found: ${provider}:${resourceType}`);
    }
    const importedFields: Property[] = [];
    rt.properties?.forEach((property) => {
      if (property.deployTime && property.required) {
        importedFields.push(property);
      }
    });

    return importedFields;
  }

  getImportableResourceTypes(): ResourceType[] {
    const result: ResourceType[] = [];
    this.resourceTypes.forEach((element) => {
      element.properties?.forEach((property) => {
        if (property.deployTime && property.required) {
          result.push(element);
          return;
        }
      });
    });
    return result;
  }

  applyCustomizations() {
    Object.entries(customConfigMappings).forEach(([qualifiedType, config]) => {
      const [provider, type] = qualifiedType.split(":");
      const resourceType = this.getResourceType(provider, type);
      if (resourceType) {
        config.resourceTypeModifier?.(resourceType);
      }
    });
  }
}
