import React, { memo, useMemo } from "react";
import { Handle, Position, useStore, useUpdateNodeInternals } from "reactflow";
import { getIcon } from "./ResourceMappings";
import useApplicationStore from "../../views/store/store";

import "./NodeStyles.scss";

interface ResourceNodeProps {
  id: string;
  data: any;
  isConnectable: boolean;
  isSelected?: boolean;
}

const connectionNodeIdSelector = (state: any) => state.connectionNodeId;

export default memo(
  ({ id, data, isConnectable, isSelected }: ResourceNodeProps) => {
    const { architecture } = useApplicationStore();
    const connectionNodeId = useStore(connectionNodeIdSelector);
    const isConnecting = !!connectionNodeId;
    const isTarget = connectionNodeId && connectionNodeId !== id;
    const updateNodeInternals = useUpdateNodeInternals();
    const handles = useMemo(() => {
      updateNodeInternals(id);

      return data.handles?.map((h: any) => {
        return (
          <Handle
            type={h.type}
            position={h.position}
            id={h.id}
            style={{
              // TODO: align handles according to edge data
              background: "#545B64",
              visibility: "hidden",
            }}
            onConnect={(params) => console.log("handle onConnect", params)}
            isConnectable={isConnectable}
          />
        );
      });
    }, [updateNodeInternals, id, data, isConnectable]);

    return (
      <>
        {handles}
        {!isConnecting && (
          <Handle
            className="customHandle"
            id={`${id}-dnd-source`}
            position={Position.Right}
            type="source"
          />
        )}

        {isConnecting && (
          <Handle
            className="customHandle"
            id={`${id}-dnd-target`}
            position={Position.Left}
            type="target"
          />
        )}

        <div
          style={{
            textAlign: "center",
            width: "100px",
            maxHeight: "200px",
          }}
        >
          {getIcon(
            data.resourceId.provider,
            data.resourceId.type,
            {
              height: "100%",
              width: "100%",
              style: {
                // displays a green border around new nodes
                boxShadow: isSelected
                  ? "rgb(44 183 27 / 82%) 0px 0px 4px 4px"
                  : undefined,
              },
            },
            data
          )}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                width: "200%",
                left: "-50px",
                overflowWrap: "anywhere",
                paddingBottom: "2px",
              }}
            >
              <b>{data.label}</b>
            </div>
            <div
              style={{
                position: "relative",
                width: "200%",
                left: "-50px",
                overflowWrap: "anywhere",
                fontSize: "smaller",
              }}
            >
              <i>
                {data.resourceId.provider === architecture.provider
                  ? data.resourceId.type
                  : `${data.resourceId.provider}:${data.resourceId.type}`}
              </i>
            </div>
          </div>
        </div>
      </>
    );
  }
);
