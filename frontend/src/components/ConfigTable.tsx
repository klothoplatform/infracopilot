"use client";

import type { CustomFlowbiteTheme } from "flowbite-react";
import { Card, Table } from "flowbite-react";
import useApplicationStore from "../views/store/store";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const cardTheme: CustomFlowbiteTheme["card"] = {
  root: {
    base: "flex h-full rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800",
    children: "flex h-full flex-col justify-center",
  },
};

export default function ConfigTable() {
  const {
    nodes,
    architecture,
    selectedNode,
    selectedResource,
    selectResource,
  } = useApplicationStore();

  const [rows, setRows] = useState<ReactNode[]>([]);

  useEffect(() => {
    selectResource(nodes.find((n) => n.id === selectedNode)?.data?.resourceId);
  }, [nodes, selectResource, selectedNode]);

  useEffect(() => {
    if (
      architecture === undefined ||
      !(architecture.resourceMetadata instanceof Array) ||
      selectedResource === undefined
    ) {
      setRows([]);
      return;
    }
    const metadata = (architecture.resourceMetadata as any[])?.find((e) => {
      return e.id === selectedResource?.toKlothoIdString();
    })?.metadata;

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
  }, [architecture, nodes, selectedNode, selectedResource]);

  return (
    <>
      {rows.length > 0 && (
        <Card theme={cardTheme} className="max-h-[60vh]">
          <div className={"max-h-[60vh] overflow-auto"}>
            <Table striped>
              <Table.Body className="divide-y">{rows}</Table.Body>
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}
