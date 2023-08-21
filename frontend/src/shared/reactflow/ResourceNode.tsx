import React, { memo, useContext, useMemo } from "react";
import { Handle, useUpdateNodeInternals } from "reactflow";
import { getIcon } from "./ResourceMappings";
import { ResourceGraphContext } from "../resource-graph/ResourceGraph";

interface ResourceNodeProps {
  id: string;
  data: any;
  isConnectable: boolean;
}

export default memo(({ id, data, isConnectable }: ResourceNodeProps) => {
  const { graph } = useContext(ResourceGraphContext);
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
              {data.resourceId.provider === graph.Provider
                ? data.resourceId.type
                : `${data.resourceId.provider}:${data.resourceId.type}`}
            </i>
          </div>
        </div>
      </div>
    </>
  );
});
