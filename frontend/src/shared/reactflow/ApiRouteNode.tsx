import React, { memo, useMemo, useState } from "react";
import { Handle, Position, useStore, useUpdateNodeInternals } from "reactflow";
import useApplicationStore from "../../pages/store/ApplicationStore";

import "./NodeStyles.scss";
import classNames from "classnames";
import { RightSidebarDetailsTabs, RightSidebarTabs } from "../sidebar-nav";

interface RouteNodeProps {
  id: string;
  data: any;
  isConnectable: boolean;
}

const connectionNodeIdSelector = (state: any) => state.connectionNodeId;

const ApiRouteNode = memo(({ id, data, isConnectable }: RouteNodeProps) => {
  const { selectedResource, selectNode, selectResource, navigateRightSidebar } =
    useApplicationStore();

  const connectionNodeId = useStore(connectionNodeIdSelector);
  const isConnecting = !!connectionNodeId;
  const isSelected = selectedResource === data.resourceId;
  const [mouseOverNode, setMouseOverNode] = useState(false);
  const [mouseOverHandle] = useState(false);
  const showSourceHandle = !isConnecting && (mouseOverNode || mouseOverHandle);
  const updateNodeInternals = useUpdateNodeInternals();

  const onSelect = () => {
    selectResource(data.resourceId);
    selectNode(id);
    navigateRightSidebar([
      RightSidebarTabs.Details,
      RightSidebarDetailsTabs.Config,
    ]);
  };

  const handles = useMemo(() => {
    updateNodeInternals(id);

    return data.handles?.map((h: any) => {
      return (
        <Handle
          key={h.id}
          type={h.type}
          position={h.position}
          id={h.id}
          style={{
            // TODO: align handles according to edge data
            background: "#545B64",
            visibility: "hidden",
          }}
          isConnectable={isConnectable}
        />
      );
    });
  }, [updateNodeInternals, id, data, isConnectable]);

  return (
    // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events
    <div
      className={classNames(
        "resource-node api-route-node pointer-events-none flex h-full w-full flex-col justify-center border-2",
        {
          "border-primary-600/100 dark:border-primary-500/100": isSelected,
          "border-primary-600/[0]": !isSelected,
        },
      )}
      onMouseOver={(e) => {
        setMouseOverNode(true);
      }}
      onMouseLeave={(e) => {
        setMouseOverNode(false);
      }}
    >
      <button
        className="pointer-events-auto h-full w-full border-2 border-gray-300 bg-gray-100 p-1 dark:border-gray-900 dark:bg-gray-700"
        onClick={onSelect}
      >
        <div className="flex items-center justify-start gap-2 text-ellipsis px-1 dark:text-white">
          <div className={"font-semibold"}>{data.resourceMeta.method}</div>
          <div>{data.resourceMeta.path}</div>
        </div>
      </button>
      {handles}
      {isConnecting && (
        <Handle
          // eslint-disable-next-line tailwindcss/no-custom-classname
          className="full-icon-handle"
          id={`${id}-dnd-target`}
          position={Position.Left}
          type="target"
        />
      )}
      <Handle
        className={classNames("node-handle", {
          "opacity-0": !showSourceHandle,
        })}
        id={`${id}-dnd-source`}
        position={Position.Right}
        type="source"
      >
        <div className="handle-source handle-right pointer-events-none">
          &nbsp;
        </div>
      </Handle>
    </div>
  );
});
ApiRouteNode.displayName = "ApiRouteNode";

export default ApiRouteNode;
