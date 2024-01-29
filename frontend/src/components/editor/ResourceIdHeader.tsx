import { Banner, Button, useThemeMode } from "flowbite-react";
import { HiCheck, HiInformationCircle, HiOutlineClipboardCopy } from "react-icons/hi";
import { TbPlugConnected } from "react-icons/tb";
import { NodeIcon } from "../../shared/resources/ResourceMappings";
import { type FC, useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { type NodeId } from "../../shared/architecture/TopologyNode";

type ResourceIdHeaderProps = {
  resourceId?: NodeId;
  edgeId?: string;
};

const ResourceIdHeader: FC<ResourceIdHeaderProps> = function ({
  resourceId,
  edgeId,
}) {
  const { mode } = useThemeMode();

  const [copied, setCopied] = useState(false);

  const { environmentVersion, selectedResource } = useApplicationStore();
  let resourceMetadata;
  if (selectedResource) {
    resourceMetadata = environmentVersion?.resources.get(
      selectedResource.toString(),
    );
  }

  const onClickCopyButton = async (e: any) => {
    e.target.blur();
    await navigator.clipboard.writeText(
      resourceId?.toString() ?? edgeId?.toString() ?? "",
    );
    setCopied(true);
    e.target.disabled = true;
    setTimeout(() => {
      e.target.disabled = false;
      setCopied(false);
    }, 3000);
  };

  const itemType = resourceId?.qualifiedType ?? "connection";
  const itemName = resourceId
    ? `${resourceId.namespace ? resourceId.namespace + ":" : ""}${
        resourceId.name
      }`
    : edgeId;

  return (
    <>
      {(resourceId || edgeId) && (
        <div className="border-b-2 border-gray-200 pb-1 dark:border-gray-700">
          <div className={"mb-2 flex flex-row items-center gap-2"}>
            {resourceId ? (
              <NodeIcon
                provider={resourceId?.provider ?? "unknown"}
                type={resourceId?.type ?? "unknown"}
                style={{ maxHeight: "50px", maxWidth: "50px" }}
                variant={mode}
              />
            ) : (
              <TbPlugConnected
                className="stroke-gray-700 dark:stroke-gray-300"
                size={50}
              />
            )}
            <div className="inline-block w-full overflow-hidden align-middle">
              <div
                className="overflow-hidden text-ellipsis text-xs font-medium text-gray-500 dark:text-gray-400"
                title={itemType}
              >
                {itemType}
              </div>
              <div
                className={
                  "text-md overflow-hidden text-ellipsis font-semibold dark:text-white"
                }
                title={itemName}
              >
                {itemName}
                <div />
              </div>
            </div>
            <Button
              color="gray"
              className="h-14 w-10 focus:ring-0"
              onClick={onClickCopyButton}
              disabled={resourceId === undefined}
            >
              {!copied && (
                <HiOutlineClipboardCopy className="stroke-gray-700 dark:stroke-gray-300" />
              )}
              {copied && <HiCheck color="green" />}
            </Button>
          </div>
          {resourceMetadata?.imported && (
            <Banner>
              <div className="flex w-full justify-between border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
                <div className="mx-auto flex items-center">
                  <p className="flex items-center text-sm font-normal text-gray-500 dark:text-gray-400">
                    <HiInformationCircle className="mr-4 size-4" />
                    <span className="[&_p]:inline">
                      This resource is imported and configured externally
                    </span>
                  </p>
                </div>
              </div>
            </Banner>
          )}
        </div>
      )}
    </>
  );
};