import React from "react";
import type { EdgeProps, Node } from "reactflow";
import { BaseEdge, BezierEdge } from "reactflow";

import { ElkEdgeSection } from "elkjs/lib/elk.bundled";
import { SVGDrawFunction, svgDrawSmoothLinePath } from "./drawSvgPath";

export interface SmartEdgeSection extends ElkEdgeSection {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type EdgeParams = Pick<
  EdgeProps,
  | "sourceX"
  | "sourceY"
  | "targetX"
  | "targetY"
  | "sourcePosition"
  | "targetPosition"
>;

export type GetSmartEdgeReturn = {
  svgPathString: string;
  edgeCenterX: number;
  edgeCenterY: number;
};

export type GetSmartEdgeOptions = {
  drawEdge?: SVGDrawFunction;
};

export type GetSmartEdgeParams<NodeDataType = unknown> = EdgeParams & {
  options?: GetSmartEdgeOptions;
  nodes: Node<NodeDataType>[];
  edgeSection: SmartEdgeSection;
};

export const getSmartEdge = <NodeDataType = unknown,>({
  options = {},
  nodes = [],
  edgeSection,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: GetSmartEdgeParams<NodeDataType>): GetSmartEdgeReturn | null => {
  try {
    const { drawEdge = svgDrawSmoothLinePath } = options;

    const targetNode = nodes.find((n) => n.id === edgeSection.outgoingShape);
    const sourceNode = nodes.find((n) => n.id === edgeSection.incomingShape);

    const sourceParentNodes = findParents(sourceNode, nodes);
    const targetParentNodes = findParents(targetNode, nodes);
    const pXOffset = sourceParentNodes.map((n) => n.position.x).reduce(add, 0);
    const pYOffset = sourceParentNodes.map((n) => n.position.y).reduce(add, 0);
    let oX = 0;
    let oY = 0;

    // // add the group offset if the source is a group and the target is a child of the same group
    // if (
    //   sourceNode?.type?.toLowerCase().includes("group") &&
    //   sourceNode.parentNode &&
    //   targetNode?.parentNode === sourceNode?.parentNode
    // ) {
    //   oX += sourceNode?.position.x;
    //   oY += sourceNode?.position.y;
    // }
    // calculate offset for edges with nodes with the same parent or where the destination is the parent of the source
    if (
      sourceParentNodes?.slice(-1).length &&
      [...targetParentNodes?.slice(-1), targetNode].find(
        (n) => n === sourceParentNodes?.slice(-1)[0],
      )
    ) {
      // if source and destination have the same parent or the destination is the parent of the source, use the parent offset
      if (
        sourceNode?.parentNode === targetNode?.parentNode ||
        targetNode?.id === sourceNode?.parentNode ||
        (targetParentNodes.length > sourceParentNodes.length &&
          targetParentNodes.find((n) => n.id === sourceNode?.parentNode))
      ) {
        oX = pXOffset;
        oY = pYOffset;
      } else {
        oX =
          pXOffset -
          sourceParentNodes
            .slice(0, sourceParentNodes.length - 1)
            .map((p) => p.position.x)
            .reduce(add, 0);
        oY =
          pYOffset -
          sourceParentNodes
            .slice(0, sourceParentNodes.length - 1)
            .map((p) => p.position.y)
            .reduce(add, 0);
      }
    }

    let graphPath = [
      ...[
        edgeSection.startPoint,
        ...(edgeSection.bendPoints ?? []),
        edgeSection.endPoint,
      ].map((p) => [p.x + oX, p.y + oY]),
    ];

    // TODO: extract some of this translation logic into helper functions,
    //       so we don't have to pass the output around as much

    // helps with determining diagram bounds for export
    edgeSection.maxX = Math.max(...graphPath.map((p) => p[0]));
    edgeSection.maxY = Math.max(...graphPath.map((p) => p[1]));
    edgeSection.minX = Math.min(...graphPath.map((p) => p[0]));
    edgeSection.minY = Math.min(...graphPath.map((p) => p[1]));

    // Finally, we can use the graph path to draw the edge
    const svgPathString = drawEdge(graphPath);

    //TODO: calculate edge center based on our updated elk path logic

    // // Compute the edge's middle point using the full path, so users can use
    // // it to position their custom labels
    // const index = Math.floor(fullPath.length / 2);
    // const middlePoint = fullPath[index];
    // const [middleX, middleY] = middlePoint;
    // const { x: edgeCenterX, y: edgeCenterY } = gridToGraphPoint(
    //   { x: middleX, y: middleY },
    //   graphBox.xMin,
    //   graphBox.yMin,
    //   gridRatio
    // );

    const edgeCenterX = 0,
      edgeCenterY = 0;
    return { svgPathString, edgeCenterX, edgeCenterY };
  } catch (e) {
    console.log(e);
    return null;
  }
};

function findParent(node?: Node, nodes?: Node[]): Node | undefined {
  return nodes?.find((n) => n.id === node?.parentNode);
}

function findParents(node?: Node, nodes?: Node[]): Node[] {
  const pNodes = Array<Node>();
  while (node?.parentNode) {
    const parent = findParent(node, nodes);
    if (!parent) {
      throw new Error(
        `parent node [${node.parentNode}] not found for child [${node.id}]`,
      );
    }
    pNodes.push(parent);
    node = parent;
  }
  return pNodes;
}

export type EdgeElement = typeof BezierEdge;

export type SmartEdgeOptions = GetSmartEdgeOptions & {
  fallback?: EdgeElement;
};

export interface SmartEdge<EdgeDataType = unknown, NodeDataType = unknown>
  extends EdgeProps<EdgeDataType> {
  nodes: Node<NodeDataType>[];
  options: SmartEdgeOptions;
}

export function SmartElkEdge<EdgeDataType = unknown, NodeDataType = unknown>({
  nodes,
  options,
  ...edgeProps
}: SmartEdge<EdgeDataType, NodeDataType>) {
  const {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    style,
    label,
    labelStyle,
    labelShowBg,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    markerEnd,
    markerStart,
    interactionWidth,
    data,
  } = edgeProps;

  const smartResponse = getSmartEdge({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    options,
    nodes,
    edgeSection: (data as any)?.edgeSection as SmartEdgeSection,
  });

  const FallbackEdge = options.fallback || BezierEdge;

  if (smartResponse === null) {
    return <FallbackEdge {...edgeProps} />;
  }

  const { edgeCenterX, edgeCenterY, svgPathString } = smartResponse;

  return (
    <BaseEdge
      path={svgPathString}
      labelX={edgeCenterX}
      labelY={edgeCenterY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      style={style}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  );
}

function add(a: number, b: number): number {
  return a + b;
}
