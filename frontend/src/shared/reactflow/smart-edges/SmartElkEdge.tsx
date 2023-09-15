import React from "react";
import type { EdgeProps, Node } from "reactflow";
import { BaseEdge, BezierEdge, EdgeLabelRenderer } from "reactflow";

import type { ElkEdgeSection } from "elkjs/lib/elk.bundled";
import type { SVGDrawFunction } from "./drawSvgPath";
import { svgDrawSmoothLinePath } from "./drawSvgPath";

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

export interface GetSmartEdgeReturn {
  svgPathString: string;
  edgeCenterX: number;
  edgeCenterY: number;
  labelX: number;
  labelY: number;
}

export interface GetSmartEdgeOptions {
  drawEdge?: SVGDrawFunction;
}

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
      sourceParentNodes.slice(-1).length &&
      [...targetParentNodes.slice(-1), targetNode].find(
        (n) => n === sourceParentNodes.slice(-1)[0],
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

    const graphPath = [
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

    // Compute the edge's middle point using the full path, so users can use
    // it to position their custom labels
    const edgeCenterX =
      edgeSection.minX + (edgeSection.maxX - edgeSection.minX) / 2;
    const edgeCenterY =
      edgeSection.minY + (edgeSection.maxY - edgeSection.minY) / 2;
    const labelPosition = positionLabel(edgeCenterX, graphPath);
    return {
      svgPathString,
      edgeCenterX,
      edgeCenterY,
      labelX: labelPosition.x,
      labelY: labelPosition.y,
    };
  } catch (e) {
    console.debug(e);
    return null;
  }
};

type Point = {
  x: number;
  y: number;
};

function positionLabel(x: number, path: number[][]): Point {
  // find the closest point on the path to the x coordinate
  const closestPoint = path.reduce(
    (closest, point, currentIndex) => {
      const distance = Math.abs(point[0] - x);
      if (distance < closest.distance) {
        return { point, distance, currentIndex };
      }
      return closest;
    },
    { point: path[0], distance: Infinity, currentIndex: 0 },
  );

  // find the other point on the segment closest to the x coordinate
  let oppositePoint = path[closestPoint.currentIndex + 1];
  if (x < closestPoint.point[0]) {
    oppositePoint = path[closestPoint.currentIndex - 1];
  }

  // find the direction of the segment
  const segmentDirection = findSegmentDirection(
    closestPoint.point,
    oppositePoint,
  );
  // find the y coordinate of the label
  switch (segmentDirection) {
    case "ascending":
      return {
        x:
          closestPoint.point[0] +
          (oppositePoint[0] - closestPoint.point[0]) / 2,
        y:
          closestPoint.point[1] -
          (closestPoint.point[1] - oppositePoint[1]) / 2,
      };
    case "descending":
      return {
        x:
          closestPoint.point[0] +
          (oppositePoint[0] - closestPoint.point[0]) / 2,
        y:
          closestPoint.point[1] +
          (oppositePoint[1] - closestPoint.point[1]) / 2,
      };
    case "horizontal":
    default:
      return {
        x,
        y: closestPoint.point[1],
      };
  }
}

function findSegmentDirection(
  pointA: number[],
  pointB: number[],
): "ascending" | "descending" | "horizontal" {
  if (pointA[1] === pointB[1]) {
    return "horizontal";
  }
  if (pointA[1] < pointB[1]) {
    return "descending";
  }
  return "ascending";
}

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

  const { svgPathString, labelX, labelY } = smartResponse;

  return (
    <>
      <BaseEdge
        path={svgPathString}
        style={style}
        markerStart={markerStart}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              ...labelStyle,
            }}
            className="absolute z-20 overflow-hidden text-ellipsis  rounded-lg border-[1px] border-gray-700 bg-gray-100 p-[10px] text-center text-xs dark:border-gray-200 dark:bg-gray-800 dark:text-gray-200"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function add(a: number, b: number): number {
  return a + b;
}
