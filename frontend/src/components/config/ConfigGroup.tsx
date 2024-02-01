import type {
  MapProperty,
  Property,
} from "../../shared/resources/ResourceTypes";
import { CollectionTypes } from "../../shared/resources/ResourceTypes";
import type { FC, ReactNode } from "react";
import { ConfigField } from "./ConfigField";
import type { NodeId } from "../../shared/architecture/TopologyNode";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { canModifyConfiguration } from "../../shared/EditorViewSettings";

type ConfigGroupProps = {
  configResource?: NodeId;
  qualifiedFieldName?: string;
  valueSelector?: string;
  fields?: Property[];
  hidePrefix?: boolean;
  filter?: (field: Property, resourceId?: NodeId) => boolean;
};

export const ConfigGroup: FC<ConfigGroupProps> = ({
  configResource,
  qualifiedFieldName,
  valueSelector,
  fields,
  hidePrefix,
  filter,
}) => {
  const { environmentVersion } = useApplicationStore();

  const { viewSettings } = useApplicationStore();

  const rows: ReactNode[] = [];
  let resourceMetadata: any;
  if (configResource) {
    resourceMetadata = environmentVersion?.resources?.get(
      configResource.toString(),
    );
  }

  const parentLength = qualifiedFieldName?.split(".").length;
  // Make sure that all field names are fully qualified with the configResource prefix
  const prefix =
    qualifiedFieldName?.startsWith(`${configResource}#`) ||
    configResource === undefined
      ? ""
      : `${configResource}#`;
  const addRow = (property: Property, resourceId?: NodeId) => {
    if (filter) {
      if (filter(property, resourceId)) {
        return;
      }
    } else {
      if (resourceMetadata?.imported) {
        if (property.hidden === true) {
          return;
        }
      } else if (
        property.deployTime ||
        property.configurationDisabled ||
        property.hidden
      ) {
        return;
      }
    }

    rows.push(
      <div key={rows.length} className="h-fit max-w-full p-1">
        <ConfigField
          // only show the resource if it isn't the one selected
          field={property}
          qualifiedFieldName={
            qualifiedFieldName
              ? `${prefix}${qualifiedFieldName}.${property.name}`
              : `${prefix}${property.qualifiedName}`
          }
          valueSelector={valueSelector}
          title={
            parentLength && hidePrefix
              ? qualifiedFieldName.split(".").slice(parentLength).join(".") +
                property.name
              : property.qualifiedName
          }
          required={
            (property.required && !resourceMetadata?.imported) ||
            (property.required &&
              property.deployTime &&
              resourceMetadata?.imported)
          }
          disabled={
            (property.configurationDisabled && !resourceMetadata?.imported) ||
            !canModifyConfiguration(viewSettings)
          }
        />
      </div>,
    );
  };

  fields
    ?.map((property) =>
      property.type === CollectionTypes.Map &&
      (property as MapProperty).valueType === CollectionTypes.Map
        ? property.properties?.map((child) => ({
            ...child,
            name: `${property.name}.${child.name}`,
          })) ?? property
        : property,
    )
    .flat()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((property: Property) => addRow(property, configResource));

  return <>{rows}</>;
};
