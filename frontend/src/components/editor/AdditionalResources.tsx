import { Table, useThemeMode } from "flowbite-react";
import type { FC, ReactNode } from "react";
import * as React from "react";
import { useEffect, useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { NodeIcon } from "../../shared/resources/ResourceMappings";
import { ArchitectureView } from "../../shared/architecture/Architecture";
import type { NodeId } from "../../shared/architecture/TopologyNode";

function AdditionalResources() {
  const { mode } = useThemeMode();
  const [resourceRows, setResourceRows] = useState<ReactNode[]>([]);
  const { environmentVersion, nodes, edges, selectedResource, selectedEdge } =
    useApplicationStore();

  useEffect(() => {
    if (selectedResource === undefined && selectedEdge === undefined) {
      setResourceRows([]);
      return;
    }

    let connectedNodes: NodeId[] = [];
    if (selectedResource !== undefined) {
      connectedNodes =
        environmentVersion.views
          .get(ArchitectureView.DataFlow)
          ?.Nodes.find((n) => n.resourceId === selectedResource)?.vizMetadata
          .children ?? [];
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
                className="size-full"
                variant={mode}
              />
            }
            resourceId={nodeId}
          />
        ))
        .filter((e) => e !== null),
    );
  }, [nodes, edges, selectedResource, selectedEdge, environmentVersion, mode]);
  if (resourceRows.length === 0) {
    return null;
  }

  return (
    <div className="border-box relative size-full overflow-auto">
      <Table
        hoverable
        theme={{
          root: {
            wrapper: "relative w-full overflow-auto",
          },
        }}
      >
        <Table.Body className="divide-y">{resourceRows}</Table.Body>
      </Table>
    </div>
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
      className="border-box relative w-full"
      onClick={() => {
        selectResource(resourceId);
      }}
    >
      <Table.Cell className="pr-0 font-medium text-gray-900 dark:text-white">
        <div className="block size-5">{icon}</div>
      </Table.Cell>
      <Table.Cell className="w-full pl-4 dark:text-white">
        {resourceId.toString()}
      </Table.Cell>
    </Table.Row>
  );
};

export default AdditionalResources;
