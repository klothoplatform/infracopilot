import React, { memo, useEffect, useMemo, useState } from "react";
import { Handle, Position, useStore, useUpdateNodeInternals } from "reactflow";
import useApplicationStore from "../../../store/ApplicationStore";

import "../../../../shared/reactflow/NodeStyles.scss";
import classNames from "classnames";
import {
  RightSidebarDetailsTab,
  RightSidebarMenu,
} from "../../../../shared/sidebar-nav";
import { canModifyTopology } from "../../../../shared/EditorViewSettings";

interface RouteNodeProps {
  id: string;
  data: any;
  isConnectable: boolean;
}

const connectionNodeIdSelector = (state: any) => state.connectionNodeId;

const ApiIntegrationNode = memo(
  ({ id, data, isConnectable }: RouteNodeProps) => {
    const {
      selectedResource,
      selectNode,
      selectResource,
      navigateRightSidebar,
      edgeTargetState: { validTargets },
      viewSettings,
    } = useApplicationStore();

    const connectionNodeId = useStore(connectionNodeIdSelector);
    const isConnecting = !!connectionNodeId;
    const isSelected = selectedResource?.equals(data.resourceId);
    const [mouseOverNode, setMouseOverNode] = useState(false);
    const [mouseOverHandle] = useState(false);
    const showSourceHandle =
      !isConnecting && (mouseOverNode || mouseOverHandle);

    const isValidConnectionTarget =
      isConnecting &&
      connectionNodeId !== id &&
      (validTargets.get(connectionNodeId) ?? []).includes(id);

    const isInvalidConnectionTarget =
      isConnecting &&
      connectionNodeId !== id &&
      validTargets.size &&
      !(validTargets.get(connectionNodeId) ?? []).includes(id);

    const updateNodeInternals = useUpdateNodeInternals();

    const onSelect = () => {
      selectResource(data.resourceId);
      selectNode(id);
      navigateRightSidebar([
        RightSidebarMenu.Details,
        RightSidebarDetailsTab.Config,
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

    useEffect(() => {
      updateNodeInternals(id);
    }, [id, updateNodeInternals, viewSettings]);

    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        className={classNames(
          "resource-node api-route-node pointer-events-none flex h-full w-full flex-col justify-center border-2",
          {
            "border-primary-600/100 dark:border-primary-500/100": isSelected,
            "border-primary-600/[0]": !isSelected && !isValidConnectionTarget,
            "border-blue-700 dark:border-blue-200 shadow-md shadow-blue-100 dark:shadow-blue-900":
              mouseOverNode && isValidConnectionTarget,
            "border-blue-400 dark:border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900":
              !mouseOverNode && isValidConnectionTarget,
            "border-red-600/100 dark:border-red-700/100 shadow-md shadow-red-100 dark:shadow-red-900":
              isConnecting && isInvalidConnectionTarget && mouseOverNode,
          },
        )}
        onMouseOver={(e) => {
          setMouseOverNode(true);
        }}
        onMouseLeave={(e) => {
          setMouseOverNode(false);
        }}
        onFocus={(e) => {
          setMouseOverNode(true);
        }}
        onBlur={(e) => {
          setMouseOverNode(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSelect();
          }
        }}
      >
        <button
          className="pointer-events-auto size-full border-2 border-gray-300 bg-gray-100 p-1 dark:border-gray-900 dark:bg-gray-700"
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
        {canModifyTopology(viewSettings) && (
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
        )}
      </div>
    );
  },
);
ApiIntegrationNode.displayName = "ApiRouteNode";

export default ApiIntegrationNode;
