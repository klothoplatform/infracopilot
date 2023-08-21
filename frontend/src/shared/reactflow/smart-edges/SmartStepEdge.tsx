import React from "react";
import type { EdgeProps } from "reactflow";
import { SmoothStepEdge, StepEdge, useNodes } from "reactflow";
import { SmartElkEdge, SmartEdgeOptions } from "./SmartElkEdge";
import { svgDrawSmoothLinePath, svgDrawStraightLinePath } from "./drawSvgPath";

const StepConfiguration: SmartEdgeOptions = {
  drawEdge: svgDrawStraightLinePath,
  fallback: SmoothStepEdge,
};

const SmoothStepConfiguration: SmartEdgeOptions = {
  drawEdge: svgDrawSmoothLinePath,
  fallback: StepEdge,
};

export function SmartStepEdge<EdgeDataType = unknown, NodeDataType = unknown>(
  props: EdgeProps<EdgeDataType>
) {
  const nodes = useNodes<NodeDataType>();

  return (
    <SmartElkEdge<EdgeDataType, NodeDataType>
      {...props}
      options={StepConfiguration}
      nodes={nodes}
    />
  );
}

export function SmartSmoothStepEdge<
  EdgeDataType = unknown,
  NodeDataType = unknown
>(props: EdgeProps<EdgeDataType>) {
  const nodes = useNodes<NodeDataType>();

  return (
    <SmartElkEdge<EdgeDataType, NodeDataType>
      {...props}
      options={SmoothStepConfiguration}
      nodes={nodes}
    />
  );
}
