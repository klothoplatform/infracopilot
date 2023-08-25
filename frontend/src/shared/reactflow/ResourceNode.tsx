import React, { memo, useContext, useMemo } from "react";
import { Handle, useUpdateNodeInternals } from "reactflow";
import { getIcon } from "./ResourceMappings";
import { ArchitectureContext } from "../architecture/TopologyGraph";

interface ResourceNodeProps {
  id: string;
  data: any;
  isConnectable: boolean;
  isSelected?: boolean;
}

export default memo(
  ({ id, data, isConnectable, isSelected }: ResourceNodeProps) => {
    const { architecture } = useContext(ArchitectureContext);
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
                boxShadow: data.isSelected
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
