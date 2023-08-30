import React from "react";
import { Handle, Position } from "reactflow";
import { getIcon } from "./ResourceMappings";

interface IndicatorNodeProps {
  data: any;
  isConnectable: boolean;
}

export const IndicatorNode = (props: IndicatorNodeProps) => {
  const { isConnectable } = props;
  return (
    <div
      style={{
        height: "100px",
        display: "inline-flex",
        alignItems: "center",
        // marginInline: "-4px",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ visibility: "hidden" }}
        isConnectable={isConnectable}
      />
      {getIcon(
        props.data.resourceId.provider,
        props.data.resourceId.type,
        undefined,
        props.data.iconVariant,
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="b"
        style={{ visibility: "hidden" }}
        isConnectable={isConnectable}
      />
    </div>
  );
};
