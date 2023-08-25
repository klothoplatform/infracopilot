import { StoreApi, UseBoundStore } from "zustand";
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
  ReactFlowElements,
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

export type EditorState = {
  layoutOptions: LayoutOptions;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  selectedNode?: string;
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
};

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useEditorStoreBase = createWithEqualityFn<EditorState>(
  (set, get) => ({
    nodes: [] as Node[],
    edges: [] as Edge[],
    selectedNode: undefined,
    layoutRefreshing: false,
    layoutOptions: DefaultLayoutOptions,
    onNodesChange: (changes: NodeChange[]) => {
      set({
        nodes: applyNodeChanges(changes, get().nodes),
      });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
      console.log("edges changed", changes);
      const edges = applyEdgeChanges(changes, get().edges);
      const nodes = get().nodes;
      const constraints = changes
        .map((change: any) => {
          const sourceNode = nodes.find(
            (node) => node.id === change?.item.source
          );
          const targetNode = nodes.find(
            (node) => node.id === change?.item.target
          );
          switch (change.type) {
            case "add":
              return new EdgeConstraint(
                ConstraintOperator.MustExist,
                sourceNode?.data.resourceId,
                targetNode?.data.resourceId,
                change.item.data
              );
            case "remove":
              return new EdgeConstraint(
                ConstraintOperator.MustNotExist,
                sourceNode?.data.resourceId,
                targetNode?.data.resourceId,
                change.item.data
              );
          }
        })
        .filter((constraint) => constraint !== undefined) as EdgeConstraint[];
      set({
        edges,
        unappliedConstraints: [...get().unappliedConstraints, ...constraints],
      });
      get().refreshLayout();
      console.log("edges changed", constraints);
    },
    onConnect: (connection: Connection) => {
      set({
        edges: addEdge(connection, get().edges),
      });
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
      set({
        architecture: await getArchitecture(id, version),
      });
      console.log("architecture loaded");
    },
    refreshLayout: async () => {
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

      set({
        nodes,
        edges,
        layoutRefreshing: false,
      });
      const end = performance.now();
      console.log(`layout took ${end - start}ms`);
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

      set({
        canApplyConstraints: false,
      });
      await applyConstraints(
        architecture.id,
        architecture.latestVersion,
        get().unappliedConstraints
      );
      set({
        unappliedConstraints: [],
        canApplyConstraints: true,
      });
    },
    connectionSourceId: undefined,
  }),
  shallow
);

const useEditorStore = createSelectors(useEditorStoreBase);

export default useEditorStore;
