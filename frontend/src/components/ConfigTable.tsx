"use client";

import { Card, Table } from "flowbite-react";
import useApplicationStore from "../views/store/store";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export default function ConfigTable() {
  const { nodes, architecture, selectedNode } = useApplicationStore();

  const [rows, setRows] = useState<ReactNode[]>([]);

  useEffect(() => {
    const selectedNodeId = nodes
      ?.find((e) => e.id === selectedNode)
      ?.data?.resourceId?.toKlothoIdString();
    if (
      architecture === undefined ||
      !(architecture.resourceMetadata instanceof Array) ||
      selectedNode === undefined
    ) {
      setRows([]);
      return;
    }
    const metadata = (architecture.resourceMetadata as any[])?.find((e) => {
      console.log(e.id, selectedNodeId);
      return e.id === selectedNodeId;
    })?.metadata;

    console.log(metadata);

    if (metadata === undefined) {
      setRows([]);
      return;
    }
    setRows(
      Object.entries(metadata).map(([key, value]) => {
        return (
          <Table.Row
            key={key}
            className="bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
              {key}
            </Table.Cell>
            <Table.Cell>
              <pre>
                {typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2)}
              </pre>
            </Table.Cell>
          </Table.Row>
        );
      }),
    );
  }, [architecture, nodes, selectedNode]);

  return (
    <>
      {rows.length > 0 && (
        <Card className="drop-shadow-xs p-2">
          <div className={"mb-2 ml-2 inline"}>
            <Table striped>
              <Table.Body className="divide-y">{rows}</Table.Body>
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}
