import type { FC } from "react";
import { DiffStatus, type Diff } from "../../shared/architecture/TopologyDiff";
import { Accordion, Badge, Table } from "flowbite-react";

interface ModifiedResourceListProps {
  resources?: { [key: string]: Diff };
  sourceEnvironment: string;
  targetEnvironmentId: string;
}

export const accordianHeader = (
  key: string,
  resource: any,
  sourceEnvironment: string,
  targetEnvironmentId: string,
) => {
  return (
    <div className="align-items-center flex">
      <h3 className="grow-1 mb-2 flex  p-2">{key}</h3>
      {resource.status === DiffStatus.ADDED ? (
        <Badge color="success">Added to {targetEnvironmentId}</Badge>
      ) : resource.status === DiffStatus.REMOVED ? (
        <Badge color="failure">Removed from {sourceEnvironment}</Badge>
      ) : (
        <Badge color="warning">Modified Properties</Badge>
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
    <Table striped className="justify-left flex ">
      <Table.Body>
        <Table.Head>
          <Table.Cell>Property</Table.Cell>
          <Table.Cell>Old Value</Table.Cell>
          <Table.Cell>New Value</Table.Cell>
        </Table.Head>
        {Object.entries(properties).map(([propKey, [oldValue, newValue]]) => (
          <Table.Row key={propKey}>
            <Table.Cell>{propKey}</Table.Cell>
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
      <Accordion key={key} className="p-5">
        <Accordion.Panel>
          <div className="mb-4 pl-4">
            <Accordion.Title>
              {accordianHeader(
                key,
                resource,
                sourceEnvironment,
                targetEnvironmentId,
              )}
            </Accordion.Title>

            <Accordion.Content>
              {resource.status === DiffStatus.CHANGED &&
                propertyDiffTable(resource.properties)}
              {resource.status === DiffStatus.ADDED && (
                <p>
                  This edge exists in {targetEnvironmentId}, but does not exist
                  in {sourceEnvironment}
                </p>
              )}
              {resource.status === DiffStatus.REMOVED && (
                <p>
                  This edge exists in {sourceEnvironment}, but does not exist in{" "}
                  {targetEnvironmentId}
                </p>
              )}
            </Accordion.Content>
          </div>
        </Accordion.Panel>
      </Accordion>
    ));

  return <div>{resourceComponents ?? "No resources modified"}</div>;
};
