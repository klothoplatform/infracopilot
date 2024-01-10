import type { Edge, Node } from "reactflow";
import { Position } from "reactflow";
import type { ElkExtendedEdge, ElkLabel, ElkNode } from "elkjs/lib/elk.bundled";
import ELK from "elkjs/lib/elk.bundled";
import { customConfigMappings } from "../../pages/ArchitectureEditor/config/CustomConfigMappings";
import type { Architecture } from "../architecture/Architecture";

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
    "elk.separateConnectedComponents": "false",
    "elk.spacing.componentComponent": "0",
    "elk.layered.spacing.edgeEdgeBetweenLayers": "25",
    "elk.layered.spacing.edgeNodeBetweenLayers": "25",
    "org.eclipse.elk.nodeSize.minimum": ElkSize(100, 100),
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
    "elk.nodeLabels.placement": "[H_CENTER, V_TOP, INSIDE]",
    "org.eclipse.elk.nodeSize.minimum": ElkSize(200, 200),
    "elk.padding": ElkMap({
      top: 40,
      left: 10,
      bottom: 20,
      right: 20,
    }),
  },
};

export function ElkMap(input: object): string {
  return `[${Object.keys(input)
    .map((k) => `${k}=${input[k as keyof object]}`)
    .join(",")}]`;
}

export function ElkSize(width: number, height: number): string {
  return `(${width},${height})`;
}

function sizedLabel(
  label: ElkLabel,
  fontSize = 16,
  minHeight = 80,
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
  architecture: Architecture,
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
      workerFactory: function (url) {
        const { Worker } = require("elkjs/lib/elk-worker.js"); // non-minified
        return new Worker(url);
      },
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
            width: node.type === "resourceGroup" ? 200 : 100,
            height: node.type === "resourceGroup" ? 200 : 100,
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

    const elkGroupNodes = nodes
      .filter((node) => node.type === "resourceGroup")
      .map((p) => elkNodesById.get(p.id) as ElkNode)
      .filter((p) => p);

    elkGroupNodes.forEach((group) => {
      group.children = nodes
        .filter((n) => n.parentNode === group.id)
        .map((n) => elkNodesById.get(n.id) as ElkNode);
      group.labels = [
        sizedLabel(
          {
            text: group.labels?.map((l) => l.text)?.join("/") ?? "UNKNOWN",
          },
          16,
          32,
          600,
          140,
          30,
        ),
      ];

      group.layoutOptions = {
        ...elkConfig.groupLayout,
        "elk.padding": ElkMap({
          top: 28 + (group.labels[0].height ?? 0),
          left: 20,
          bottom: 20,
          right: 20,
        }),
      };
    });

    const nodeHierarchyForElk = [...elkNodesById.values()].filter(
      (n) => !nonRoots.has(n.id),
    );

    const edgesForElk = edges?.map((e): ElkExtendedEdge => {
      return {
        id: e.id,
        sources: [e.source],
        targets: [e.target],
        // TODO: look into a more robust way to handle edge labels
        labels: e.label
          ? [
              sizedLabel(
                {
                  text: typeof e.label === "string" ? (e.label as string) : "",
                },
                12,
                32,
                300,
                80,
                30,
              ),
            ]
          : undefined,
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

    // apply any custom layout modifiers
    const resourceTypes = [
      ...new Set(nodes.map((node) => node.data.resourceId.qualifiedType)),
    ];
    resourceTypes.forEach((type) => {
      customConfigMappings[type]?.layoutModifier?.({
        architecture: architecture,
        elkGraph: elkGraph,
        reactFlow: { nodes: nodes ?? [], edges: edges ?? [] },
      });
    });
    const root = await elk.layout(elkGraph, {});
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
          zIndex: node.type === "resourceGroup" ? -1 : 1,
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
              ...edge.data,
            },
            hidden: false, // we're currently hiding all edges until after they're all laid out with elk
            type: layoutOptions.flowEdgeType,
            sourceHandle: `${edge.id}:${source?.id ?? ""}:s`,
            targetHandle: `${edge.id}:${target?.id ?? ""}:t`,
            markerEnd: "arrow-closed",
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

export function flattenHierarchy(n: ElkNode) {
  const q = [n];
  const output: ElkNode[] = [];
  while (q.length) {
    const currentNode = q.pop()!;
    output.push(currentNode);
    q.push(...(currentNode.children ?? []));
  }
  return output;
}
