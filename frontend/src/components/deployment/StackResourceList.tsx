import type { FC } from "react";
import { Accordion, Badge, Table } from "flowbite-react";

interface StackResourceListProps {
  resources: any[];
}

export const AccordianHeader: FC<{
  resourceId: string;
  resourceType: string;
}> = ({ resourceId, resourceType }) => {
  return (
    <div className="flex items-center justify-between gap-4 overflow-hidden text-ellipsis">
      <h3 className={"w-fit overflow-hidden text-ellipsis text-sm font-medium"}>
        {resourceId}
      </h3>
      <Badge color="success" className={"whitespace-nowrap"}>
        {resourceType}
      </Badge>
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

export const propertyTable = (properties: { [key: string]: any }) => {
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
        <Table.HeadCell>Value</Table.HeadCell>
      </Table.Head>
      <Table.Body>
        {Object.entries(properties).map(([propKey, value]) => (
          <Table.Row
            key={propKey}
            className={"bg-white dark:border-gray-700 dark:bg-gray-800"}
          >
            <Table.Cell
              className={"text-xs font-medium text-gray-900 dark:text-white"}
            >
              {propKey}
            </Table.Cell>
            <Table.Cell>{renderValue(value)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

export const ResourceList: FC<StackResourceListProps> = ({ resources }) => {
  const resourceComponents =
    resources &&
    resources.map((resource) => (
      <Accordion key={resource.id} collapseAll={true}>
        <Accordion.Panel>
          <Accordion.Title
            theme={{
              heading: "w-full pr-4",
              base: "flex w-full items-center justify-between first:rounded-t-lg last:rounded-b-lg py-2 px-4 text-left font-medium text-gray-500 dark:text-gray-400",
            }}
          >
            <AccordianHeader
              resourceId={resource.id}
              resourceType={resource.type}
            />
          </Accordion.Title>

          <Accordion.Content className={"overflow-x-auto p-0"}>
            {propertyTable(resource.properties)}
          </Accordion.Content>
        </Accordion.Panel>
      </Accordion>
    ));

  return (
    <div className="flex flex-col gap-4">
      {resourceComponents?.length ? (
        resourceComponents
      ) : (
        <p>No resources found</p>
      )}
    </div>
  );
};
