import type { Edge, Node } from "reactflow";
import { MarkerType, Position } from "reactflow";
import type { ElkExtendedEdge, ElkLabel, ElkNode } from "elkjs/lib/elk.bundled";
import ELK from "elkjs/lib/elk.bundled";

export enum NodePlacementStrategy {
  NETWORK_SIMPLEX = "Network Simplex",
  INTERACTIVE = "Interactive",
  SIMPLE = "Simple",
  LINEAR_SEGMENTS = "Linear Segments",
  BRANDES_KOEPF = "Brandes Koepf",
}

export enum NodeLayeringStrategy {
  NETWORK_SIMPLEX = "Network Simplex",
  LONGEST_PATH = "Longest Path",
  LONGEST_PATH_SOURCE = "Longest Path Source",
  COFFMAN_GRAHAM = "Coffman Graham",
  INTERACTIVE = "Interactive",
  STRETCH_WIDTH = "Stretch Width",
  MIN_WIDTH = "Min Width",
  BF_MODEL_ORDER = "BF Model Order",
  DF_MODEL_ORDER = "DF Model Order",
}

export enum ConnectorType {
  UNDEFINED = "Undefined",
  POLYLINE = "Polyline",
  ORTHOGONAL = "Orthogonal",
  SPLINES = "Splines",
}

export enum EdgeType {
  STEP = "step",
  SMOOTHSTEP = "smoothstep",
  BEZIER = "bezier",
  SMART_STEP = "smartstep",
  SMART_SMOOTH_STEP = "smartsmoothstep",
}

export interface LayoutOptions {
  elkPlacementStrategy: NodePlacementStrategy;
  elkNodeLayeringStrategy: NodeLayeringStrategy;
  elkConnectorType: ConnectorType;
  flowEdgeType: EdgeType;
  mergeEdges: boolean;
}

export const DefaultLayoutOptions: LayoutOptions = {
  elkPlacementStrategy: NodePlacementStrategy.NETWORK_SIMPLEX,
  elkNodeLayeringStrategy: NodeLayeringStrategy.COFFMAN_GRAHAM,
  elkConnectorType: ConnectorType.ORTHOGONAL,
  flowEdgeType: EdgeType.SMART_STEP,
  mergeEdges: false,
};

const elkConfig = {
  rootLayout: {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
  },
  defaultLayout: {
    "spacing.nodeNode": "40",
    "spacing.componentComponent": "50",
    "spacing.edgeEdge": "25",
    "elk.layered.spacing.edgeEdgeBetweenLayers": "25",
    "elk.layered.spacing.edgeNodeBetweenLayers": "25",
    "org.eclipse.elk.nodeSize.minimum": "(100,100)",
    "elk.layered.unnecessaryBendpoints": "true",
    "org.eclipse.elk.nodeSize.constraints": `[${[
      // "NODE_LABELS",
      "MINIMUM_SIZE",
    ].join(" ")}]`,
    "elk.insideSelfLoops.activate": "true",
    hierarchyHandling: "INCLUDE_CHILDREN",
    "org.eclipse.elk.nodeSize.options": `${[
      //   "DEFAULT_MINIMUM_SIZE",
      "COMPUTE_PADDING",
      //   "UNIFORM_PORT_SPACING",
      //   "FORCE_TABULAR_NODE_LABELS",
    ].join(" ")}]`,

    "crossingMinimization.semiInteractive": "true",
    "elk.layered.feedbackEdges": "true",
  },
  groupLayout: {
    "elk.nodeLabels.placement": "[H_CENTER, V_BOTTOM, OUTSIDE]",
    "elk.padding": ElkMap({
      top: 40,
      left: 10,
      bottom: 20,
      right: 20,
    }),
  },
};

function ElkMap(input: object): string {
  return `[${Object.keys(input)
    .map((k) => `${k}=${input[k as keyof object]}`)
    .join(",")}]`;
}

function sizedLabel(
  label: ElkLabel,
  fontSize = 16,
  minHeight = 32,
  maxWidth = 600,
  maxHeight = 140,
  lineChars = 12,
): ElkLabel {
  label.width = Math.min(
    ((label.text?.length ?? lineChars) * fontSize) /
      ((label.text?.length ?? lineChars) / lineChars),
    maxWidth,
  );

  const height = Math.max(
    ((label.text?.length ?? lineChars) / lineChars) * fontSize,
    minHeight,
  );
  label.height = Math.min(height, maxHeight);
  return label;
}

export function getKeyByValue(obj: object, key: string) {
  const keys = Object.keys(obj).filter((x) => obj[x as keyof object] === key);
  return keys.length > 0 ? keys[0] : "";
}

export interface AutoLayoutResult {
  nodes: Node[];
  edges: Edge[];
}

function handlePosition(
  x: number,
  y: number,
  offsetX = 0,
  offsetY = 0,
  node?: ElkNode,
): Position {
  if (!node) {
    return Position.Left;
  }

  const nX = node.x ?? 0;
  const nY = node.y ?? 0;

  // is it vertical?
  if (x > nX && x < nX + (node.width ?? 1)) {
    return y > nY ? Position.Bottom : Position.Top;
  }
  return x > nX ? Position.Right : Position.Left;
}

export async function autoLayout(
  nodes?: Node[],
  edges?: Edge[],
  layoutOptions = DefaultLayoutOptions,
): Promise<AutoLayoutResult> {
  console.log("autoLayout called");
  if (!nodes) {
    return { nodes: [], edges: [] };
  }
  try {
    const elk = new ELK({
      defaultLayoutOptions: {
        ...elkConfig.defaultLayout,
        "elk.edgeRouting": getKeyByValue(
          ConnectorType,
          layoutOptions.elkConnectorType,
        ),
        "elk.layered.mergeEdges": layoutOptions.mergeEdges ? "true" : "false",
      },
    });
    const nonRoots = new Set<string>();
    const elkNodesById = new Map<string, ElkNode>(
      nodes.map((node) => {
        if (node.parentNode) {
          nonRoots.add(node.id);
        }
        return [
          node.id,
          {
            id: node.id,
            width: 100,
            height: 100,
            labels: [
              sizedLabel({ text: node.data?.resourceId?.type ?? "UNKNOWN" }),
              sizedLabel({ text: node.data?.resourceId?.name ?? "UNKNOWN" }),
            ],
            children: [],
            layoutOptions: {
              "org.eclipse.elk.alignment": "LEFT",
              "elk.nodeLabels.placement": "[H_CENTER, V_BOTTOM, OUTSIDE]",
            },
          } as ElkNode,
        ];
      }),
    );
    for (const n of nodes) {
      const parentNode = elkNodesById.get(n.parentNode ?? "");
      if (parentNode) {
        parentNode.children = parentNode.children ? parentNode.children : [];
        parentNode.children.push(elkNodesById.get(n.id) as any);

        parentNode.labels = [
          sizedLabel(
            {
              text:
                parentNode.labels?.map((l) => l.text)?.join("/") ?? "UNKNOWN",
            },
            16,
            32,
            600,
            140,
            30,
          ),
        ];
        parentNode.layoutOptions = {
          ...elkConfig.groupLayout,
          "elk.padding": ElkMap({
            top: 28 + (parentNode.labels[0].height ?? 0),
            left: 20,
            bottom: 0,
            right: 20,
          }),
        };
      }
    }
    const nodeHierarchyForElk = [...elkNodesById.values()].filter(
      (n) => !nonRoots.has(n.id),
    );

    const edgesForElk = edges?.map((e): ElkExtendedEdge => {
      return {
        id: e.id,
        sources: [e.source],
        targets: [e.target],
      };
    });
    const elkGraph = {
      id: "root",
      layoutOptions: {
        ...elkConfig.rootLayout,
        "nodePlacement.strategy": getKeyByValue(
          NodePlacementStrategy,
          layoutOptions.elkPlacementStrategy,
        ),
        "org.eclipse.elk.layered.layering.strategy": getKeyByValue(
          NodeLayeringStrategy,
          layoutOptions.elkNodeLayeringStrategy,
        ),
      },
      children: nodeHierarchyForElk,
      edges: edgesForElk,
    };
    const root = await elk.layout(elkGraph, {});

    const flattenHierarchy = (n: ElkNode) => {
      const q = [n];
      const output: ElkNode[] = [];
      while (q.length) {
        const currentNode = q.pop()!;
        output.push(currentNode);
        q.push(...(currentNode.children ?? []));
      }
      return output;
    };
    const elkNodes = flattenHierarchy(root);

    const handlesByNode = new Map<string, any>();
    root.edges?.forEach((e) => {
      e.sections?.forEach((s) => {
        // TODO: rework all the handle layout stuff since that's all broken

        const sourceId = s.incomingShape ?? "";
        const targetId = s.outgoingShape ?? "";
        const sourceNode = elkNodesById.get(sourceId);
        const targetNode = elkNodesById.get(targetId);

        const sourceParent = elkNodes.find(
          (n) => n.children?.find((c) => c.id === sourceId),
        );
        // const targetParent = elkNodes.find((n) =>
        //   n.children?.find((c) => c.id === targetId)
        // );

        const offsetX = sourceParent?.x ?? 0;
        const offsetY = sourceParent?.y ?? 0;

        const startX = s.startPoint.x + ((sourceNode?.x ?? 0) - s.startPoint.x);
        const startY = s.startPoint.y + ((sourceNode?.y ?? 0) - s.startPoint.y);
        const endX = s.endPoint.x + ((sourceNode?.x ?? 0) - s.startPoint.x);
        const endY = s.endPoint.y + ((sourceNode?.y ?? 0) - s.startPoint.y);

        handlesByNode.set(sourceId, [
          ...(handlesByNode.get(sourceId) ?? []),
          {
            x: startX + offsetX,
            y: startY + offsetY,
            node: sourceId,
            id: `${e.id}:${sourceId}:s`,
            type: "source",
            position: handlePosition(
              s.startPoint.x,
              s.startPoint.y,
              offsetX,
              offsetY,
              sourceNode,
            ),
          },
        ]);
        handlesByNode.set(targetId, [
          ...(handlesByNode.get(targetId) ?? []),
          {
            node: targetId,
            id: `${e.id}:${targetId}:t`,
            type: "target",
            x: endX + offsetX,
            y: endY + offsetY,
            position: handlePosition(
              s.endPoint.x,
              s.endPoint.y,
              offsetX,
              offsetY,
              targetNode,
            ),
          },
        ]);
      });
    });

    // set the React Flow nodes with the positions from the layout
    const result = {
      nodes: nodes.map((node) => {
        // find the node in the hierarchy with the same id and get its coordinates

        // eslint-disable-next-line prefer-const
        let { x, y, width, height } = elkNodes.find((d) => d.id === node.id)!;
        x = x ?? node.position.x;
        y = y ?? node.position.y;
        return {
          ...node,
          sourcePosition: Position.Left,
          targetPosition: Position.Right,
          position: { x, y },
          positionAbsolute: { x, y },
          zIndex: node.type === "resourceGroup" ? 0 : 1,
          style: {
            width,
            height,
          },
          data: {
            ...node.data,
            handles: handlesByNode.get(node.id),
          },
        };
      }),
      edges:
        edges?.map((edge) => {
          const source = elkNodes.find((s) => s.id === edge.source);
          const target = elkNodes.find((s) => s.id === edge.target);
          return {
            ...edge,
            data: {
              edgeSection: root.edges
                ?.find((e) => e.id === edge.id)
                ?.sections?.find(
                  (s) =>
                    s.incomingShape === edge.source &&
                    s.outgoingShape === edge.target,
                ),
                ...edge.data
            },
            hidden: false, // we're currently hiding all edges until after they're all laid out with elk
            type: layoutOptions.flowEdgeType,
            style: { stroke: "#545B64", strokeWidth: "2" },
            sourceHandle: `${edge.id}:${source?.id ?? ""}:s`,
            targetHandle: `${edge.id}:${target?.id ?? ""}:t`,
            zIndex: 1,
            markerEnd:
              nodes.find((e) => e.id === edge.target)?.data?.resourceId
                .provider !== "indicators"
                ? {
                    type: MarkerType.ArrowClosed,
                    color: "#545B64",
                    width: 220,
                    height: 10,
                  }
                : undefined,
          };
        }) ?? [],
    };
    console.debug(result);
    return result;
  } catch (e) {
    console.error(e);
    return { nodes, edges: edges ?? [] };
  }
}
