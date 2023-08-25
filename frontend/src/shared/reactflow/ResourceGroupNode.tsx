import React, { memo, useContext, useMemo } from "react";
import { getGroupIcon, getIconMapping } from "./ResourceMappings";
import { Handle, useUpdateNodeInternals } from "reactflow";
import { ArchitectureContext } from "../architecture/TopologyGraph";

interface GroupNodeProps {
  id: string;
  data: any;
  style?: object;
  isConnectable: boolean;
}

export default memo(({ id, data, isConnectable }: GroupNodeProps) => {
  const { architecture } = useContext(ArchitectureContext);

  const iconMapping = getIconMapping(
    data.resourceId.provider,
    data.resourceId.type,
    data
  );
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
          borderColor: "gray",
          boxShadow: `0px 0px 0px 2px ${
            iconMapping?.groupStyle?.borderColor ?? "gray"
          } inset`,
          backgroundColor: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          ...iconMapping?.groupStyle,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            flexDirection: "row",
            verticalAlign: "top",
          }}
        >
          {getGroupIcon(
            data.resourceId.provider,
            data.resourceId.type,
            {
              style: {
                width: "24px",
                height: "24px",
                marginRight: "4px",
                ...iconMapping?.groupIconStyle,
              },
            },
            data
          )}
        </span>
        <span
          style={{
            display: "inline-flex",
            fontStyle: "bold",
            overflowWrap: "anywhere",
            paddingTop: "6px",
            paddingRight: "6px",
            paddingLeft: "6px",
          }}
        >
          {data.resourceId.provider === architecture.provider
            ? `${data.resourceId.type}/${data.resourceId.name}`
            : data.resourceId.toString()}
        </span>
      </div>
    </>
  );
});
