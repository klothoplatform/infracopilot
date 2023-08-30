import React from "react";
import type { ConnectionLineComponentProps } from "reactflow";
import { getStraightPath } from "reactflow";

function StraightConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle,
}: ConnectionLineComponentProps) {
  const [edgePath] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  return (
    <g>
      <path style={connectionLineStyle} fill="none" d={edgePath} />
      <circle
        cx={toX}
        cy={toY}
        fill="blue"
        r={2}
        stroke="blue"
        strokeWidth={1.5}
      />
    </g>
  );
}

export default StraightConnectionLine;
