import type { Edge, Node, Rect } from "reactflow";
import type { Options } from "html-to-image/src/types";
import { addInfraCopilotWatermark } from "./AddInfraCopilotWatermark";
import { toPng, toSvg } from "html-to-image";
import { allGroupTypes, allNodeTypes } from "../reactflow/NodeTypes";

// Watermark defines valid watermark types
export enum Watermark {
  InfraCopilot = "infracopilot",
}

function downloadImage(dataUrl: string, format: string) {
  const a = document.createElement("a");

  a.setAttribute("download", `reactflow.${format.toLowerCase()}`);
  a.setAttribute("href", dataUrl);
  a.click();
}

export async function exportImage(
  nodes: Node[],
  edges: Edge[],
  format: string,
  watermark?: Watermark,
): Promise<string> {
  const boundingElements = getBoundingElements(nodes, edges);
  const nodesBounds = getDiagramSize(boundingElements);
  const exportSettings: Options = {
    width: nodesBounds.width,
    height: nodesBounds.height,
    canvasHeight: nodesBounds.height,
    canvasWidth: nodesBounds.width,
    style: {
      transform: `translate(${nodesBounds.x}px, ${nodesBounds.y}px)`,
    },
  };

  const viewPort = document.querySelector(
    ".react-flow__viewport",
  )! as HTMLElement;

  let watermarkContainer;
  if (watermark === Watermark.InfraCopilot) {
    watermarkContainer = addInfraCopilotWatermark(
      exportSettings,
      boundingElements,
      nodesBounds,
      viewPort,
    );
  }

  let image;
  switch (format) {
    case "svg": {
      image = await toSvg(viewPort, exportSettings);
      break;
    }
    case "png":
    default: {
      image = await toPng(viewPort, exportSettings);
    }
  }
  watermarkContainer?.remove();
  return image;
}

function maxY(node: Node): number {
  return (node.positionAbsolute?.y ?? 0) + (node.height ?? 0);
}

function maxX(node: Node): number {
  return (node.positionAbsolute?.x ?? 0) + (node.width ?? 0);
}

export interface BoundingElements {
  minXNode: Node;
  minYNode: Node;
  maxXNode: Node;
  maxYNode: Node;
  minXEdge?: Edge;
  minYEdge?: Edge;
  maxXEdge?: Edge;
  maxYEdge?: Edge;
  bottomElement?: Node | Edge;
}

function getBoundingElements(nodes: Node[], edges: Edge[]): BoundingElements {
  const boundingElements = {
    maxYNode: nodes.reduce((n1, n2) => (maxY(n1) > maxY(n2) ? n1 : n2)),
    maxXNode: nodes.reduce((n1, n2) => (maxX(n1) > maxX(n2) ? n1 : n2)),
    minXNode: nodes.reduce((n1, n2) => (minX(n1) < minX(n2) ? n1 : n2)),
    minYNode: nodes.reduce((n1, n2) => (minY(n1) < minY(n2) ? n1 : n2)),

    minXEdge: edges.length
      ? edges.reduce((e1, e2) =>
          e1.data.edgeSection.minX < e2.data.edgeSection.minX ? e1 : e2,
        )
      : undefined,
    minYEdge: edges.length
      ? edges.reduce((e1, e2) =>
          e1.data.edgeSection.minY < e2.data.edgeSection.minY ? e1 : e2,
        )
      : undefined,
    maxXEdge: edges.length
      ? edges.reduce((e1, e2) =>
          e1.data.edgeSection.maxX > e2.data.edgeSection.maxX ? e1 : e2,
        )
      : undefined,
    maxYEdge: edges.length
      ? edges.reduce((e1, e2) =>
          e1.data.edgeSection.maxY > e2.data.edgeSection.maxY ? e1 : e2,
        )
      : undefined,
  } as BoundingElements;

  const maxYNode = boundingElements.maxYNode;

  const maxYEdge = boundingElements.maxYEdge;

  boundingElements.bottomElement = !maxYEdge
    ? maxYNode
    : maxY(maxYNode) > maxYEdge.data.edgeSection.maxY
    ? maxYNode
    : maxYEdge;

  return boundingElements;
}

export function isNode(nodeOrEdge?: Node | Edge): boolean {
  return !!(nodeOrEdge?.type && allNodeTypes.has(nodeOrEdge.type));
}

export function isGroup(nodeOrEdge?: Node | Edge): boolean {
  return !!(nodeOrEdge?.type && allGroupTypes.has(nodeOrEdge.type));
}

function getDiagramSize(boundingNodes: BoundingElements): Rect {
  const {
    minXNode,
    minYNode,
    maxXNode,
    maxYNode,
    bottomElement,
    minXEdge,
    minYEdge,
    maxXEdge,
    maxYEdge,
  } = boundingNodes;

  const edgeMinX: number | undefined = minXEdge?.data?.edgeSection?.minX;
  const edgeMinY: number | undefined = minYEdge?.data?.edgeSection?.minY;
  const edgeMaxX: number | undefined = maxXEdge?.data?.edgeSection?.maxX;
  const edgeMaxY: number | undefined = maxYEdge?.data?.edgeSection?.maxY;

  const nodeConstrained = isNode(bottomElement);

  const xPadding = 26 * (isNode(minXNode) || isNode(maxXNode) ? 2 : 0);
  const xOffset = 26 * (isNode(minXNode) || isNode(maxXNode) ? 2 : 0);
  const yPadding =
    40 * (isGroup(maxYNode) ? 1 : 2) + (isGroup(bottomElement) ? 10 : 20);
  const yOffset = 40 * (isGroup(maxYNode) ? 1 : 2);

  const width = Math.max(maxX(maxXNode), edgeMaxX ?? maxX(maxXNode)) + xPadding;
  const height =
    Math.max(maxY(maxYNode), edgeMaxY ?? maxY(maxYNode)) + yPadding;

  return {
    width,
    height,
    x: -(Math.min(minX(minXNode), edgeMinX ?? minX(minXNode)) - xOffset) / 2,
    y:
      -(
        Math.min(minY(minYNode), edgeMinY ?? minY(minYNode)) -
        yOffset / (nodeConstrained ? 3 : 2)
      ) / 2,
  };
}

function minX(node: Node): number {
  return node.positionAbsolute?.x ?? 0;
}

function minY(node: Node): number {
  return node.positionAbsolute?.y ?? 0;
}
