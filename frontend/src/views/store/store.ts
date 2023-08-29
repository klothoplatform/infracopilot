import {
  State,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  UseBoundStore,
} from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "reactflow";
import {
  Architecture,
  ArchitectureView,
  ReactFlowElements,
  toReactFlowElements,
} from "../../shared/architecture/Architecture";
import { getArchitecture } from "../../api/GetArchitecture";
import {
  autoLayout,
  DefaultLayoutOptions,
  LayoutOptions,
} from "../../shared/reactflow/AutoLayout";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import {
  ApplicationConstraint,
  Constraint,
  ConstraintOperator,
  EdgeConstraint,
} from "../../shared/architecture/Constraints";
import { applyConstraints } from "../../api/ApplyConstraints";
import TopologyEdge from "../../shared/architecture/TopologyEdge";
import { NodeId } from "../../shared/architecture/TopologyNode";
import zukeeper from "zukeeper";

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  let store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (let k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

type ZukeeperTS = <
  T extends State,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>
) => StateCreator<T, Mps, Mcs>;

type ZukeeperTSImplType = <T extends State>(
  f: StateCreator<T, [], []>
) => StateCreator<T, [], []>;

const zukeeperTs: ZukeeperTSImplType = (...a) => {
  return zukeeper(...a);
};

export const zukeeperTsLogger = zukeeperTs as unknown as ZukeeperTS;

export type EditorState = {
  layoutOptions: LayoutOptions;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  deletingNodes: boolean; // used for skipping layout refresh on a node's dependent edges
  onConnect: OnConnect;
  selectedNode?: string;
  selectedEdge?: string;
  selectNode: (nodeId: string) => void;
  deselectNode: (nodeId: string) => void;
  architecture: Architecture;
  loadArchitecture: (id: string, version?: number) => Promise<void>;
  refreshLayout: () => Promise<void>;
  layoutRefreshing: boolean;
  addGraphElements: (
    elements: Partial<ReactFlowElements>,
    generateConstraints?: boolean
  ) => Promise<void>;
  unappliedConstraints: Constraint[];
  applyConstraints: () => Promise<void>;
  canApplyConstraints: boolean;
  connectionSourceId?: string;
  selectEdge: (edgeId: string) => void;
  deselectEdge: (edgeId: string) => void;
  deleteElements: (elements: Partial<ReactFlowElements>) => Promise<void>;
};

const useApplicationStoreBase = createWithEqualityFn<EditorState>(
  zukeeperTsLogger((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: undefined,
    selectedEdge: undefined,
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
              node.data.resourceId
            )
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
              targetNode.data.resourceId
            )
          );
        }) ?? [];
      set({
        nodes: nodes.filter(
          (n) => elements.nodes?.every((e) => e.id !== n.id) ?? true
        ),
        edges: get().edges.filter(
          (edge) => elements.edges?.find((e) => e.id === edge.id) ?? true
        ),

        unappliedConstraints: [
          ...get().unappliedConstraints,
          ...nodeConstraints,
          ...edgeConstraints,
        ],
      });
      console.log("constraints", get().unappliedConstraints);
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
                  NodeId.fromString(connection.target)
                )
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
      get().deselectNode(get().selectedNode ?? "");
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === nodeId) {
            node.data = { ...node.data, isSelected: true };
          }
          return node;
        }),
        selectedNode: nodeId,
      });
      console.log("selected node", nodeId);
    },
    deselectNode: (nodeId: string) => {
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

    architecture: {} as Architecture,
    loadArchitecture: async (id: string, version?: number) => {
      const architecture = await getArchitecture(id, version);
      const elements = toReactFlowElements(
        architecture,
        ArchitectureView.DataFlow
      );
      set({
        architecture: architecture,
        nodes: elements.nodes,
        edges: elements.edges,
      });
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
          get().layoutOptions
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
      generateConstraints = true
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
              node.data.resourceId
            )
        ) ?? [];
      let edgeConstraints: EdgeConstraint[] = [];
      if (elements.edges?.length) {
        const nodes = get().nodes;
        edgeConstraints =
          elements.edges?.map((edge) => {
            const sourceNode = nodes.find((node) => node.id === edge.source);
            const targetNode = nodes.find((node) => node.id === edge.target);
            if (!sourceNode || !targetNode) {
              throw new Error("edge source or target not found");
            }
            return new EdgeConstraint(
              ConstraintOperator.MustExist,
              sourceNode.data.resourceId,
              targetNode.data.resourceId
            );
          }) ?? [];
      }
      const constraints = [...nodeConstraints, ...edgeConstraints];
      set({
        unappliedConstraints: [...get().unappliedConstraints, ...constraints],
      });
      console.log("constraints", get().unappliedConstraints);
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
        set({
          canApplyConstraints: false,
        });
        console.log("applying constraints", get().unappliedConstraints);
        console.log("architecture", architecture);
        const newArchitecture = await applyConstraints(
          architecture.id,
          architecture.version,
          get().unappliedConstraints
        );
        console.log("new architecture", newArchitecture);
        const elements = toReactFlowElements(
          newArchitecture,
          ArchitectureView.DataFlow
        );
        const result = await autoLayout(
          elements.nodes,
          elements.edges,
          get().layoutOptions
        );
        set({
          nodes: result.nodes,
          edges: result.edges,
          unappliedConstraints: [],
          canApplyConstraints: true,
          architecture: newArchitecture,
        });
        console.log("new nodes", result.nodes);
      } catch (e) {
        set({
          unappliedConstraints: [],
          canApplyConstraints: true,
        });
        throw e;
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
      set({
        edges: get().edges.map((edge) => {
          if (edge.id === edgeId) {
            edge.data = { ...edge.data, isSelected: true };
          }
          return edge;
        }),
      });
    },
  })),
  shallow
);

// wraps the store with selectors for all state properties
const useApplicationStore = createSelectors(useApplicationStoreBase);
(window as any).store = useApplicationStore;

export default useApplicationStore;
