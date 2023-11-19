import { Table, Tooltip } from "flowbite-react";
import type { FC, ReactNode } from "react";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { getDownstreamResources } from "../../shared/architecture/Architecture";
import { ThemeContext } from "flowbite-react/lib/esm/components/Flowbite/ThemeContext";
import useApplicationStore from "../../views/store/ApplicationStore";
import { NodeIcon } from "../../shared/resources/ResourceMappings";
import type { NodeId } from "../../shared/architecture/TopologyNode";

function AdditionalResources() {
  const { mode } = useContext(ThemeContext);
  const [resourceRows, setResourceRows] = useState<ReactNode[]>([]);
  const { architecture, nodes, edges, selectedResource, selectedEdge } =
    useApplicationStore();

  useEffect(() => {
    if (selectedResource === undefined && selectedEdge === undefined) {
      setResourceRows([]);
      return;
    }

    let connectedNodes: NodeId[] = [];
    if (selectedResource !== undefined) {
      const downstreamNodes = getDownstreamResources(
        architecture,
        selectedResource,
      );
      connectedNodes = downstreamNodes;
    } else {
      edges
        .filter((edge) => edge.id === selectedEdge)
        .forEach((edge) => {
          if (edge.data.vizMetadata?.path !== undefined) {
            connectedNodes = connectedNodes.concat(edge.data.vizMetadata.path);
          }
        });
    }
    setResourceRows(
      connectedNodes
        .map((nodeId) => (
          <ResourceItem
            key={nodeId.toString()}
            icon={
              <NodeIcon
                provider={nodeId.provider}
                type={nodeId.type}
                className="h-full w-full"
                variant={mode}
              />
            }
            resourceId={nodeId}
          />
        ))
        .filter((e) => e !== null),
    );
  }, [nodes, edges, selectedResource, selectedEdge, architecture, mode]);
  if (resourceRows.length === 0) {
    return null;
  }

  return (
    <Table hoverable striped className="w-full">
      <Table.Body>{resourceRows}</Table.Body>
    </Table>
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
      <Table.Cell className="pl-4">{resourceId.toString()}</Table.Cell>
    </Table.Row>
  );
};

export default AdditionalResources;
