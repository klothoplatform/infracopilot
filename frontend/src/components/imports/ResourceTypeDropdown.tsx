import React, { useState, useEffect } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { Dropdown } from "flowbite-react";
import type { ResourceType } from "../../shared/resources/ResourceTypes";
import { set } from "date-fns";
import { useFormContext } from "react-hook-form";

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
  const { register, unregister, setValue, watch, formState } = useFormContext();

  useEffect(() => {
    setImportableResources(resourceTypeKB?.getImportableResourceTypes() ?? []);
  }, [resourceTypeKB]);

  return (
    <>
      <Dropdown
        color={"purple"}
        label={selectedValue?.displayName ?? "Select Type"}
        dismissOnClick={true}
      >
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
