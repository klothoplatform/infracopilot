import type { StoreApi, UseBoundStore } from "zustand";
import type {
  Connection,
  Edge,
  EdgeChange,
  EdgeSelectionChange,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "reactflow";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import type {
  Architecture,
  ReactFlowElements,
} from "../../shared/architecture/Architecture";
import {
  ArchitectureView,
  toReactFlowElements,
} from "../../shared/architecture/Architecture";
import { getArchitecture } from "../../api/GetArchitecture";
import type { LayoutOptions } from "../../shared/reactflow/AutoLayout";
import {
  autoLayout,
  DefaultLayoutOptions,
} from "../../shared/reactflow/AutoLayout";
import type { Constraint } from "../../shared/architecture/Constraints";
import {
  ApplicationConstraint,
  ConstraintOperator,
  EdgeConstraint,
  parseConstraints,
} from "../../shared/architecture/Constraints";
import { applyConstraints } from "../../api/ApplyConstraints";
import TopologyEdge from "../../shared/architecture/TopologyEdge";
import { NodeId } from "../../shared/architecture/TopologyNode";
import { devtools } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";
import type { RightSidebarTabSelector } from "../../shared/sidebar-nav";
import {
  RightSidebarDetailsTabs,
  RightSidebarTabs,
} from "../../shared/sidebar-nav";
import { shallow } from "zustand/shallow";
import { Decision, Failure } from "../../shared/architecture/Decision";

type WithSelectors<S> = S extends {
  getState: () => infer T;
}
  ? S & {
      use: { [K in keyof T]: () => T[K] };
    }
  : never;

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

export interface EditorState {
  layoutOptions: LayoutOptions;
  nodes: Node[];
  edges: Edge[];
  decisions: Decision[];
  failures: Failure[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  deletingNodes: boolean; // used for skipping layout refresh on a node's dependent edges
  onConnect: OnConnect;
  selectedNode?: string;
  selectedResource?: NodeId;
  selectedEdge?: string;
  selectNode: (nodeId: string) => void;
  deselectNode: (nodeId: string) => void;
  selectResource: (resourceId: NodeId) => void;
  deselectResource: (resourceId: NodeId) => void;
  architecture: Architecture;
  loadArchitecture: (id: string, version?: number) => Promise<void>;
  refreshLayout: () => Promise<void>;
  layoutRefreshing: boolean;
  addGraphElements: (
    elements: Partial<ReactFlowElements>,
    generateConstraints?: boolean,
  ) => Promise<void>;
  unappliedConstraints: Constraint[];
  applyConstraints: () => Promise<void>;
  canApplyConstraints: boolean;
  connectionSourceId?: string;
  selectEdge: (edgeId: string) => void;
  deselectEdge: (edgeId: string) => void;
  deleteElements: (elements: Partial<ReactFlowElements>) => Promise<void>;
  errors: Error[];
  replaceResource: (oldId: NodeId, newId: NodeId) => Promise<void>;
  rightSidebarSelector: RightSidebarTabSelector;

  navigateRightSidebar(selector: RightSidebarTabSelector): void;
}

const useApplicationStoreBase = createWithEqualityFn<EditorState>()(
  devtools((set, get) => ({
    errors: [],
    nodes: [],
    edges: [],
    decisions: [],
    failures: [],
    selectedNode: undefined,
    selectedEdge: undefined,
    selectedResource: undefined,
    layoutRefreshing: false,
    deletingNodes: false,
    layoutOptions: DefaultLayoutOptions,
    deleteElements: async (elements) => {
      const nodes = get().nodes;
      const nodeConstraints =
        elements.nodes?.map(
          (node) =>
            new ApplicationConstraint(
              ConstraintOperator.Remove,
              node.data.resourceId,
            ),
        ) ?? [];
      const edgeConstraints =
        elements.edges?.map((edge) => {
          const sourceNode = nodes.find((node) => node.id === edge.source);
          const targetNode = nodes.find((node) => node.id === edge.target);
          if (!sourceNode || !targetNode) {
            throw new Error("edge source or target not found");
          }
          return new EdgeConstraint(
            ConstraintOperator.MustNotExist,
            new TopologyEdge(
              sourceNode.data.resourceId,
              targetNode.data.resourceId,
            ),
          );
        }) ?? [];
      set({
        nodes: nodes.filter(
          (n) => elements.nodes?.every((e) => e.id !== n.id) ?? true,
        ),
        edges: get().edges.filter(
          (edge) => elements.edges?.find((e) => e.id === edge.id) ?? true,
        ),

        unappliedConstraints: [
          ...get().unappliedConstraints,
          ...nodeConstraints,
          ...edgeConstraints,
        ],
      });
      get().applyConstraints();
      get().refreshLayout();
    },
    onNodesChange: (changes: NodeChange[]) => {
      set({
        nodes: applyNodeChanges(changes, get().nodes),
      });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
      console.log("edges changed", changes);
      applyEdgeChanges(changes, get().edges);
    },
    onConnect: async (connection: Connection) => {
      if (connection.source === connection.target) {
        return;
      }
      const newConstraints =
        connection.source && connection.target
          ? [
              new EdgeConstraint(
                ConstraintOperator.MustExist,
                new TopologyEdge(
                  NodeId.fromString(connection.source),
                  NodeId.fromString(connection.target),
                ),
              ),
            ]
          : [];
      set({
        edges: addEdge(connection, get().edges),
        unappliedConstraints: [
          ...get().unappliedConstraints,
          ...newConstraints,
        ],
      });
      await get().applyConstraints();
      await get().refreshLayout();
      console.log("connected", connection);
    },
    selectNode: (nodeId: string) => {
      if (get().selectedNode === nodeId) {
        return;
      }
      get().deselectEdge(get().selectedEdge ?? "");
      get().deselectNode(get().selectedNode ?? "");

      set(
        {
          nodes: get().nodes.map((node) => {
            if (node.id === nodeId) {
              node.data = { ...node.data, isSelected: true };
            }
            return node;
          }),
          selectedNode: nodeId,
        },
        false,
        "editor/selectNode",
      );
      get().navigateRightSidebar([
        RightSidebarTabs.Details,
        get().rightSidebarSelector[1],
      ]);
      console.log("selected node", nodeId);
    },
    deselectNode: (nodeId: string) => {
      console.log("deselect ", nodeId);
      if (!nodeId) {
        return;
      }
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === nodeId) {
            node.data = { ...node.data, isSelected: false };
          }
          return node;
        }),
        selectedNode: undefined,
      });
      console.log("deselected node", nodeId);
    },
    selectResource: (resourceId: NodeId) => {
      const node = resourceId
        ? get().nodes?.find(
            (n) =>
              n.data?.resourceId?.toKlothoIdString() ===
              resourceId.toKlothoIdString(),
          )
        : undefined;
      if (node) {
        get().selectNode(node.id);
      }
      set(
        {
          selectedResource: resourceId,
        },
        false,
        "editor/selectResource",
      );
    },
    deselectResource: (resourceId: NodeId) => {
      if (
        get().selectedResource?.toKlothoIdString() ===
        resourceId.toKlothoIdString()
      ) {
        set(
          {
            selectedResource: undefined,
          },
          false,
          "editor/deselectResource",
        );
      }
    },
    architecture: {} as Architecture,
    loadArchitecture: async (id: string, version?: number) => {
      console.log(get().failures);
      const architecture = await getArchitecture(id, version);
      const elements = toReactFlowElements(
        architecture,
        ArchitectureView.DataFlow,
      );
      const { nodes, edges } = await autoLayout(elements.nodes, elements.edges);
      set(
        {
          architecture: architecture,
          nodes,
          edges,
          decisions: architecture.decisions.map(
            (d) => new Decision(parseConstraints(d.constraints), d.decisions),
          ),
        },
        false,
        "editor/loadArchitecture",
      );
      console.log("architecture loaded");
    },
    refreshLayout: async () => {
      try {
        console.log("refreshing layout");
        const start = performance.now();

        if (get().layoutRefreshing) {
          console.log("layout already refreshing, aborting");
          return;
        }
        set({
          layoutRefreshing: true,
        });
        const { nodes, edges } = await autoLayout(
          get().nodes,
          get().edges,
          get().layoutOptions,
        );
        edges.forEach((edge) => (edge.hidden = false));

        set({
          nodes,
          edges,
          layoutRefreshing: false,
        });
        const end = performance.now();
        console.log(`layout took ${end - start}ms`);
      } catch (e) {
        set({
          layoutRefreshing: false,
        });
        throw e;
      }
    },
    addGraphElements: async (
      elements: Partial<ReactFlowElements>,
      generateConstraints = true,
    ) => {
      const nodes = [...get().nodes, ...(elements.nodes ?? [])];
      const edges = [...get().edges, ...(elements.edges ?? [])];
      const result = await autoLayout(nodes, edges, get().layoutOptions);
      set({
        nodes: result.nodes,
        edges: result.edges,
        unappliedConstraints: [...get().unappliedConstraints],
      });

      if (!generateConstraints) {
        return;
      }
      const nodeConstraints =
        elements.nodes?.map(
          (node) =>
            new ApplicationConstraint(
              ConstraintOperator.Add,
              node.data.resourceId,
            ),
        ) ?? [];
      let edgeConstraints: EdgeConstraint[] = [];
      if (elements.edges?.length) {
        const nodes = get().nodes;
        edgeConstraints =
          elements.edges.map((edge) => {
            const sourceNode = nodes.find((node) => node.id === edge.source);
            const targetNode = nodes.find((node) => node.id === edge.target);
            if (!sourceNode || !targetNode) {
              throw new Error("edge source or target not found");
            }
            return new EdgeConstraint(
              ConstraintOperator.MustExist,
              sourceNode.data.resourceId,
              targetNode.data.resourceId,
            );
          }) ?? [];
      }
      const constraints = [...nodeConstraints, ...edgeConstraints];
      set({
        unappliedConstraints: [...get().unappliedConstraints, ...constraints],
      });
      await get().applyConstraints();
    },
    unappliedConstraints: [],
    canApplyConstraints: true,
    applyConstraints: async () => {
      if (!get().canApplyConstraints) {
        throw new Error("cannot apply constraints, already applying");
      }
      const architecture = get().architecture;
      if (!architecture) {
        throw new Error("cannot apply constraints, no architecture in context");
      }

      try {
        set(
          {
            canApplyConstraints: false,
          },
          false,
          "editor/applyConstraints:start",
        );
        console.log("applying constraints", get().unappliedConstraints);
        const newArchitecture = await applyConstraints(
          architecture.id,
          architecture.version,
          get().unappliedConstraints,
        );
        if (newArchitecture.failures.length > 0) {
          console.log(newArchitecture.failures);
          const failures = [
            new Failure(get().unappliedConstraints, newArchitecture.failures),
          ];
          console.log("failures that we should be setting", failures);
          await get().loadArchitecture(get().architecture.id);
          set(
            {
              unappliedConstraints: [],
              canApplyConstraints: true,
              failures: failures,
            },
            false,
            "editor/applyConstraints:error",
          );
          return;
        }
        console.log("new architecture", newArchitecture);
        const elements = toReactFlowElements(
          newArchitecture,
          ArchitectureView.DataFlow,
        );
        const result = await autoLayout(
          elements.nodes,
          elements.edges,
          get().layoutOptions,
        );
        const decision = new Decision(
          get().unappliedConstraints,
          newArchitecture.decisions,
        );
        set(
          {
            nodes: result.nodes,
            edges: result.edges,
            decisions: newArchitecture.decisions
              ? [decision].concat(get().decisions)
              : get().decisions,
            failures: [],
            unappliedConstraints: [],
            canApplyConstraints: true,
            architecture: newArchitecture,
          },
          false,
          "editor/applyConstraints:end",
        );
        console.log("new nodes", elements.nodes);
      } catch (e) {
        console.error("error applying constraints", e);
        await get().loadArchitecture(get().architecture.id);
        set(
          {
            unappliedConstraints: [],
            canApplyConstraints: true,
            failures: [
              new Failure(get().unappliedConstraints, [
                {
                  cause:
                    "The Klotho engine ran into an unexpected issue, the team was notified and is investigating, please try again. If this keeps occurring please join us on discord",
                },
              ]),
            ],
          },
          false,
          "editor/applyConstraints:error",
        );
      } finally {
        get().navigateRightSidebar([
          RightSidebarTabs.Changes,
          get().rightSidebarSelector[1],
        ]);
      }
    },
    connectionSourceId: undefined,
    deselectEdge: (edgeId: string) => {
      if (!edgeId) {
        return;
      }
      set({
        edges: get().edges.map((edge) => {
          if (edge.id === edgeId) {
            edge.data = { ...edge.data, isSelected: false };
          }
          return edge;
        }),
        selectedEdge: undefined,
      });
    },
    selectEdge: (edgeId: string) => {
      get().deselectEdge(get().selectedEdge ?? "");
      get().deselectNode(get().selectedNode ?? "");
      get().deselectResource(get().selectedResource ?? NodeId.fromString(""));
      get().navigateRightSidebar([
        RightSidebarTabs.Details,
        RightSidebarDetailsTabs.AdditionalResources,
      ]);
      set({
        edges: get().edges.map((edge) => {
          if (edge.id === edgeId) {
            edge.data = { ...edge.data, isSelected: true };
          }
          return edge;
        }),
        selectedEdge: edgeId,
      });
    },
    replaceResource: async (oldId: NodeId, newId: NodeId) => {
      if (oldId.toKlothoIdString() === newId.toKlothoIdString()) {
        console.log("skipping replace resource, same id");
        return;
      }

      const constraint = new ApplicationConstraint(
        ConstraintOperator.Replace,
        oldId,
        newId,
      );
      set(
        {
          unappliedConstraints: [...get().unappliedConstraints, constraint],
        },
        false,
        "editor/renameResource",
      );
      await get().applyConstraints();
    },
    rightSidebarSelector: [
      RightSidebarTabs.Changes,
      RightSidebarDetailsTabs.Config,
    ],
    navigateRightSidebar: (selector: RightSidebarTabSelector) => {
      set(
        {
          rightSidebarSelector: selector,
        },
        false,
        "editor/navigateRightSidebar",
      );
    },
  })),
  shallow,
);

// wraps the store with selectors for all state properties
const useApplicationStore = createSelectors(useApplicationStoreBase);
export default useApplicationStore;
