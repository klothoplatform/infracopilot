import React, { useEffect, useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { Dropdown } from "flowbite-react";
import type { ResourceType } from "../../shared/resources/ResourceTypes";

interface ImportResourceFormProps {
  onResourceSelection: (resourceType: ResourceType) => void;
  selectedValue?: ResourceType;
}

export const ResourceTypeDropdown = ({
  onResourceSelection,
  selectedValue,
}: ImportResourceFormProps) => {
  const { resourceTypeKB, environmentVersion } = useApplicationStore();

  const [importableResources, setImportableResources] = useState<
    ResourceType[]
  >([]);

  useEffect(() => {
    setImportableResources(resourceTypeKB?.getImportableResourceTypes() ?? []);
  }, [resourceTypeKB]);

  return (
    <>
      <Dropdown
        color={"light"}
        size={"sm"}
        label={selectedValue?.displayName ?? "Select a resource type"}
        dismissOnClick={true}
        placement={"bottom-start"}
      >
        <Dropdown.Header>Select a resource type</Dropdown.Header>
        {importableResources.map(
          (resourceType) =>
            resourceType.provider === environmentVersion.provider ||
            (environmentVersion.provider === undefined && (
              <Dropdown.Item
                key={resourceType.displayName}
                onClick={() => {
                  onResourceSelection(resourceType);
                }}
              >
                {resourceType.displayName}
              </Dropdown.Item>
            )),
        )}
      </Dropdown>
    </>
  );
};
