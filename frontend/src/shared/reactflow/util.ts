import type { Node, XYPosition } from "reactflow";
import { MarkerType, Position } from "reactflow"; // this helper function returns the intersection point

// this helper function returns the intersection point
// of the line between the center of the intersectionNode and the target node
function getNodeIntersection(intersectionNode: Node, targetNode: Node) {
  // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
  const {
    width: intersectionNodeWidth,
    height: intersectionNodeHeight,
    positionAbsolute: intersectionNodePosition,
  } = intersectionNode;
  const targetPosition = targetNode.positionAbsolute;

  const w = (intersectionNodeWidth ?? 0) / 2;
  const h = (intersectionNodeHeight ?? 0) / 2;

  const x2 = (intersectionNodePosition?.x ?? 0) + w;
  const y2 = (intersectionNodePosition?.y ?? 0) + h;
  const x1 = (targetPosition?.x ?? 0) + w;
  const y1 = (targetPosition?.y ?? 0) + h;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

// returns the position (top,right,bottom or right) passed node compared to the intersection point
function getEdgePosition(node: Node, intersectionPoint: XYPosition) {
  const n = { ...node.positionAbsolute, ...node };
  const nx = Math.round(n.x ?? 0);
  const ny = Math.round(n.y ?? 0);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + (n.width ?? 0) - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= (n.y ?? 0) + (n.height ?? 0) - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
export function getEdgeParams(source: Node, target: Node) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}

export function createNodesAndEdges() {
  const nodes: any[] = [];
  const edges: any[] = [];
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  nodes.push({ id: "target", data: { label: "Target" }, position: center });

  for (let i = 0; i < 8; i++) {
    const degrees = i * (360 / 8);
    const radians = degrees * (Math.PI / 180);
    const x = 250 * Math.cos(radians) + center.x;
    const y = 250 * Math.sin(radians) + center.y;

    nodes.push({ id: `${i}`, data: { label: "Source" }, position: { x, y } });

    edges.push({
      id: `edge-${i}`,
      target: "target",
      source: `${i}`,
      type: "floating",
      markerEnd: {
        type: MarkerType.Arrow,
      },
    });
  }

  return { nodes, edges };
}

export interface Point {
  x: number;
  y: number;
}

export enum Direction {
  Left = "left",
  Right = "right",
  Up = "up",
  Down = "down",
}

export interface LineDirection {
  vertical?: Direction.Up | Direction.Down;
  horizontal?: Direction.Left | Direction.Right;
  angle?: number;
}

// get the direction of the line using its slope angle to segment the line into 8 segments (45 degrees each)
export function getLineDirection(A: Point, B: Point): LineDirection {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const resultDirection: LineDirection = {
    angle,
    vertical: undefined,
    horizontal: undefined,
  };

  if (angle >= -22.5 && angle < 22.5) {
    resultDirection.horizontal = Direction.Right;
  } else if (angle >= 22.5 && angle < 67.5) {
    resultDirection.horizontal = Direction.Right;
    resultDirection.vertical = Direction.Down;
  } else if (angle >= 67.5 && angle < 112.5) {
    resultDirection.vertical = Direction.Down;
  } else if (angle >= 112.5 && angle < 157.5) {
    resultDirection.horizontal = Direction.Left;
    resultDirection.vertical = Direction.Down;
  } else if (angle >= 157.5 || angle < -157.5) {
    resultDirection.horizontal = Direction.Left;
  } else if (angle >= -157.5 && angle < -112.5) {
    resultDirection.horizontal = Direction.Left;
    resultDirection.vertical = Direction.Up;
  } else if (angle >= -112.5 && angle < -67.5) {
    resultDirection.vertical = Direction.Up;
  } else if (angle >= -67.5 && angle < -22.5) {
    resultDirection.horizontal = Direction.Right;
    resultDirection.vertical = Direction.Up;
  }
  return resultDirection;
}
