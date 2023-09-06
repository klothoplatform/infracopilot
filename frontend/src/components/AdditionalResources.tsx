import { Card, Table, Tooltip } from "flowbite-react";
import type { FC, ReactNode } from "react";
import * as React from "react";
import { useEffect, useState } from "react";
import { getConnectedEdges } from "reactflow";
import useApplicationStore from "../views/store/store";
import { getIcon } from "../shared/reactflow/ResourceMappings";
import { NodeId } from "../shared/architecture/TopologyNode";
import { UnknownIcon } from "./Icon";
import { getDownstreamResources } from "../shared/architecture/Architecture";

function AdditionalResources() {
  const [resourceRows, setResourceRows] = useState<ReactNode[]>([]);
  const { architecture, nodes, edges, selectedResource, selectResource } =
    useApplicationStore();

  useEffect(() => {
    if (selectedResource === undefined) {
      setResourceRows([]);
      return;
    }

    // TODO: use edges from the backend instead of the react flow graph


    const connectedNodes = getDownstreamResources(architecture, selectedResource).map((node) => node.toKlothoIdString());
    setResourceRows(
      connectedNodes
        .map((nodeIdStr) => {
          
          const nodeId = NodeId.fromId(nodeIdStr);
          const icon = nodeId
            ? getIcon(nodeId.provider, nodeId.type, {
                className: "w-full h-full",
              })
            : UnknownIcon({ className: "w-full h-full" });
          return (
            <ResourceItem
              key={nodeId.toKlothoIdString()}
              icon={icon}
              resourceId={nodeId}
            />
          );
        })
        .filter((e) => e !== null),
    );
  }, [nodes, edges, selectedResource]);

  return (
    <Card className="drop-shadow-xs">
      <Table hoverable striped>
        <Table.Body>{resourceRows}</Table.Body>
      </Table>
    </Card>
  );
}

type ResourceItemProps = {
  icon: React.JSX.Element;
  resourceId: NodeId;
};

const ResourceItem: FC<ResourceItemProps> = function ({ icon, resourceId }) {
  const { selectResource } = useApplicationStore();

  return (
    <Table.Row
      className="border-gray-300 bg-white dark:border-gray-500 dark:bg-gray-700"
      onClick={() => {
        selectResource(resourceId);
      }}
    >
      <Table.Cell className="pr-0 font-medium text-gray-900 dark:text-white">
        <Tooltip content={resourceId.type}>
          <div className="block h-5 w-5">{icon}</div>
        </Tooltip>
      </Table.Cell>
      <Table.Cell className="pl-4">{resourceId.toKlothoIdString()}</Table.Cell>
    </Table.Row>
  );
};

export default AdditionalResources;
