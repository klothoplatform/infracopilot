import type { FC } from "react";
import { DiffStatus, type Diff } from "../../shared/architecture/TopologyDiff";
import { Accordion, Badge, Table } from "flowbite-react";
import { useScreenSize } from "../../shared/hooks/useScreenSize";
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from "react-icons/vsc";

interface ModifiedResourceListProps {
  resources?: { [key: string]: Diff };
  sourceEnvironment: string;
  targetEnvironmentId: string;
}

export const AccordianHeader: FC<{
  resourceId: string;
  resource: any;
  targetEnvironmentId: string;
}> = ({ resourceId, resource, targetEnvironmentId }) => {
  const { isXSmallScreen } = useScreenSize();
  return (
    <div className="flex items-center justify-between gap-4 overflow-hidden text-ellipsis">
      <h3 className={"w-fit overflow-hidden text-ellipsis text-sm font-medium"}>
        {resourceId}
      </h3>
      {resource.status === DiffStatus.ADDED ? (
        <Badge color="success" className={"whitespace-nowrap"}>
          {isXSmallScreen ? (
            <VscDiffAdded />
          ) : (
            `Only exists in ${targetEnvironmentId}`
          )}
        </Badge>
      ) : resource.status === DiffStatus.REMOVED ? (
        <Badge color="failure" className={"whitespace-nowrap"}>
          {isXSmallScreen ? (
            <VscDiffRemoved />
          ) : (
            `Does not exist in ${targetEnvironmentId}`
          )}
        </Badge>
      ) : (
        <Badge color="warning" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffModified /> : `Modified Properties`}
        </Badge>
      )}
    </div>
  );
};

function renderValue(value: any) {
  if (typeof value === "object") {
    // If the value is an object or array, convert it to a JSON string
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
  } else {
    // Otherwise, render the value as is
    return value;
  }
}

export const propertyDiffTable = (properties: { [key: string]: any }) => {
  return (
    <Table
      striped
      theme={{
        row: {
          striped:
            "odd:bg-white even:bg-gray-50 odd:dark:bg-gray-800 even:dark:bg-gray-700",
        },
      }}
    >
      <Table.Head
        theme={{
          cell: {
            base: "bg-gray-50 dark:bg-gray-700 px-6 py-3",
          },
        }}
      >
        <Table.HeadCell>Property</Table.HeadCell>
        <Table.HeadCell>Old Value</Table.HeadCell>
        <Table.HeadCell>New Value</Table.HeadCell>
      </Table.Head>
      <Table.Body>
        {Object.entries(properties).map(([propKey, [oldValue, newValue]]) => (
          <Table.Row
            key={propKey}
            className={"bg-white dark:border-gray-700 dark:bg-gray-800"}
          >
            <Table.Cell
              className={"text-xs font-medium text-gray-900 dark:text-white"}
            >
              {propKey}
            </Table.Cell>
            <Table.Cell>
              {oldValue ? renderValue(oldValue) : "not set"}
            </Table.Cell>
            <Table.Cell>
              {newValue ? renderValue(newValue) : "not set"}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

export const ModifiedResourceList: FC<ModifiedResourceListProps> = ({
  resources,
  sourceEnvironment,
  targetEnvironmentId,
}) => {
  const resourceComponents =
    resources &&
    Object.entries(resources).map(([key, resource]) => (
      <Accordion key={key} collapseAll={resource.status !== DiffStatus.CHANGED}>
        <Accordion.Panel>
          <Accordion.Title
            theme={{
              heading: "w-full pr-4",
              base: "flex w-full items-center justify-between first:rounded-t-lg last:rounded-b-lg py-2 px-4 text-left font-medium text-gray-500 dark:text-gray-400",
            }}
          >
            <AccordianHeader
              resourceId={key}
              resource={resource}
              targetEnvironmentId={targetEnvironmentId}
            />
          </Accordion.Title>

          <Accordion.Content className={"overflow-x-auto p-0"}>
            {resource.status === DiffStatus.CHANGED ? (
              propertyDiffTable(resource.properties)
            ) : (
              <p className={"px-4 py-2 text-sm dark:text-gray-400"}>
                {resource.status === DiffStatus.ADDED && (
                  <i>
                    This resource exists in {targetEnvironmentId}, but does not
                    exist in {sourceEnvironment}
                  </i>
                )}
                {resource.status === DiffStatus.REMOVED && (
                  <i>
                    This resource exists in {sourceEnvironment}, but does not
                    exist in {targetEnvironmentId}
                  </i>
                )}
              </p>
            )}
          </Accordion.Content>
        </Accordion.Panel>
      </Accordion>
    ));

  return (
    <div className="flex flex-col gap-4">
      {resourceComponents?.length ? (
        resourceComponents
      ) : (
        <i className={"text-sm text-gray-500 dark:text-gray-400"}>
          No resources modified
        </i>
      )}
    </div>
  );
};
