import type { ConnectionLineComponentProps } from "reactflow";
import {
  ConnectionLineType,
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from "reactflow";
import type { FC } from "react";
import React from "react";
import { Direction, getLineDirection } from "./util";

const ConnectionLine: FC<ConnectionLineComponentProps> = ({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
  connectionLineType,
  connectionLineStyle,
}) => {
  let dAttr = "";
  const offset = 6;

  const pathParams = {
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  };

  if (connectionLineType === ConnectionLineType.Bezier) {
    // we assume the destination position is opposite to the source position
    [dAttr] = getBezierPath(pathParams);
  } else if (connectionLineType === ConnectionLineType.Step) {
    [dAttr] = getSmoothStepPath({
      ...pathParams,
      borderRadius: 0,
    });
  } else if (connectionLineType === ConnectionLineType.SmoothStep) {
    [dAttr] = getSmoothStepPath(pathParams);
  } else if (connectionLineType === ConnectionLineType.SimpleBezier) {
    [dAttr] = getSimpleBezierPath(pathParams);
  } else if (connectionLineType === ConnectionLineType.Straight) {
    const direction = getLineDirection(
      { x: fromX, y: fromY },
      { x: toX, y: toY },
    );

    let offsetX = toX;
    let offsetY = toY;
    if (direction.horizontal === Direction.Left) {
      offsetX += offset;
      offsetX = offsetX > fromX ? fromX : offsetX;
    }
    if (direction.vertical === Direction.Up) {
      offsetY += offset;
      offsetY = offsetY > fromY ? fromY : offsetY;
    }
    if (direction.horizontal === Direction.Right) {
      offsetX -= offset;
      offsetX = offsetX < fromX ? fromX : offsetX;
    }
    if (direction.vertical === Direction.Down) {
      offsetY -= offset;
      offsetY = offsetY < fromY ? fromY : offsetY;
    }

    [dAttr] = getStraightPath({
      sourceX: fromX,
      sourceY: fromY,
      targetX: offsetX,
      targetY: offsetY,
    });
  } else {
    [dAttr] = getStraightPath({
      sourceX: fromX,
      sourceY: fromY,
      targetX: toX,
      targetY: toY,
    });
  }

  return (
    <g>
      <defs>
        <marker
          /* eslint-disable-next-line tailwindcss/no-custom-classname */
          className="connection-arrow-closed"
          id={"connection-arrow-closed"}
          viewBox="0 0 4 4"
          refX={2}
          refY={2}
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
          style={{
            fill: connectionLineStyle?.stroke,
          }}
        >
          <path d="M 0 0 L 4 2 L 0 4 z" />
        </marker>
      </defs>
      <path
        d={dAttr}
        fill="none"
        className="react-flow__connection-path"
        markerEnd="url(#connection-arrow-closed)"
        style={connectionLineStyle}
      />
    </g>
  );
};

export default ConnectionLine;
