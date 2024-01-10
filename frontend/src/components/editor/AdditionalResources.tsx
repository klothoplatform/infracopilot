import { Table } from "flowbite-react";
import type { FC, ReactNode } from "react";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "flowbite-react/lib/esm/components/Flowbite/ThemeContext";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { NodeIcon } from "../../shared/resources/ResourceMappings";
import { ArchitectureView } from "../../shared/architecture/Architecture";
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
      connectedNodes =
        architecture.views
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
    <div className="border-box relative h-full w-full overflow-auto">
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
        <div className="block h-5 w-5">{icon}</div>
      </Table.Cell>
      <Table.Cell className="w-full pl-4 dark:text-white">
        {resourceId.toString()}
      </Table.Cell>
    </Table.Row>
  );
};

export default AdditionalResources;
