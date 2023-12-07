import type { StateCreator } from "zustand";
import type {
  Connection,
  Edge,
  EdgeChange,
  IsValidConnection,
  Node,
  NodeChange,
  OnConnect,
  OnConnectStart,
  OnEdgesChange,
  OnNodesChange,
} from "reactflow";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import type {
  Architecture,
  ConfigurationError,
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
import type {
  Constraint,
  ResourceConstraint,
} from "../../shared/architecture/Constraints";
import {
  ApplicationConstraint,
  ConstraintOperator,
  ConstraintScope,
  EdgeConstraint,
  parseConstraints,
} from "../../shared/architecture/Constraints";
import { ApplyConstraintsErrorType, applyConstraints } from "../../api/ApplyConstraints";
import TopologyEdge from "../../shared/architecture/TopologyEdge";
import { NodeId } from "../../shared/architecture/TopologyNode";
import type { RightSidebarTabSelector } from "../../shared/sidebar-nav";
import {
  RightSidebarDetailsTabs,
  RightSidebarTabs,
} from "../../shared/sidebar-nav";
import { Decision, Failure } from "../../shared/architecture/Decision";
import { getResourceTypes } from "../../api/GetResourceTypes";
import type { AuthStoreBase } from "./AuthStore";
import { ResourceTypeKB } from "../../shared/resources/ResourceTypeKB";
import { type ErrorStore } from "./ErrorStore";

import { analytics } from "../../App";
import { customConfigMappings } from "../ArchitectureEditor/config/CustomConfigMappings";
import modifyArchitecture from "../../api/ModifyArchitecture";
import { getValidEdgeTargets } from "../../api/GetValidEdgeTargets";
import { ApplicationError } from "../../shared/errors";

interface EditorStoreState {
  architecture: Architecture;
  canApplyConstraints: boolean;
  connectionSourceId?: string;
  decisions: Decision[];
  deletingNodes: boolean;
  edges: Edge[];
  isEditorInitialized: boolean;
  isEditorInitializing: boolean;
  failures: Failure[];
  layoutOptions: LayoutOptions;
  layoutRefreshing: boolean;
  nodes: Node[];
  resourceTypeKB: ResourceTypeKB;
  rightSidebarSelector: RightSidebarTabSelector;
  selectedEdge?: string;
  selectedNode?: string;
  selectedResource?: NodeId;
  unappliedConstraints: Constraint[];
  edgeTargetState: {
    architectureVersion: number;
    engineVersion: number;
    validTargets: Map<string, string[]>;
    existingEdges: Map<string, string[]>;
    updating: boolean;
  };
}

const initialState: () => EditorStoreState = () => ({
  nodes: [],
  edges: [],
  decisions: [],
  configErrors: [],
  isEditorInitialized: false,
  isEditorInitializing: false,
  failures: [],
  selectedNode: undefined,
  selectedEdge: undefined,
  selectedResource: undefined,
  layoutRefreshing: false,
  deletingNodes: false,
  layoutOptions: DefaultLayoutOptions,
  resourceTypeKB: new ResourceTypeKB(),
  architecture: {} as Architecture,
  canApplyConstraints: true,
  connectionSourceId: undefined,
  rightSidebarSelector: [
    RightSidebarTabs.Changes,
    RightSidebarDetailsTabs.Config,
  ],
  unappliedConstraints: [],
  edgeTargetState: {
    architectureVersion: 0,
    engineVersion: 0,
    validTargets: new Map<string, string[]>(),
    existingEdges: new Map<string, string[]>(),
    updating: false,
  },
});

interface EditorStoreActions {
  addGraphElements: (
    elements: Partial<ReactFlowElements>,
    generateConstraints?: boolean,
  ) => Promise<void>;
  applyConstraints: (constraints?: Constraint[]) => Promise<ConfigurationError[]>;
  deleteElements: (elements: Partial<ReactFlowElements>) => Promise<void>;
  deselectEdge: (edgeId: string) => void;
  deselectNode: (nodeId: string) => void;
  deselectResource: (resourceId: NodeId) => void;
  getResourceTypeKB: (
    architectureId: string,
    refresh?: boolean,
  ) => Promise<ResourceTypeKB>;
  initializeEditor: (id: string, version?: number) => Promise<void>;
  isValidConnection: IsValidConnection;
  navigateRightSidebar: (selector: RightSidebarTabSelector) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  selectNode: (nodeId: string) => void;
  selectResource: (resourceId: NodeId) => void;
  refreshLayout: () => Promise<void>;
  refreshArchitecture: (
    architectureId?: string,
    version?: number,
  ) => Promise<void>;
  replaceResource: (oldId: NodeId, newId: NodeId) => Promise<void>;
  resetEditorState: (newState?: Partial<EditorStoreState>) => void;
  selectEdge: (edgeId: string) => void;
  setIsEditorInitialized: (isEditorInitialized: boolean) => void;
  renameArchitecture: (newName: string) => Promise<void>;
  updateEdgeTargets: (sources?: NodeId[]) => Promise<void>;
}

type EditorStoreBase = EditorStoreState & EditorStoreActions;

export type EditorStore = EditorStoreBase & AuthStoreBase & ErrorStore;

export const editorStore: StateCreator<EditorStore, [], [], EditorStoreBase> = (
  set: (state: object, replace?: boolean, id?: string) => any,
  get,
) => ({
  ...initialState(),
  resetEditorState: (newState?: Partial<EditorStoreState>) => {
    set({ ...initialState(), ...(newState ?? {}) }, false, "editor/reset");
    console.log("editor state reset");
  },
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
    const removedNodeIds = nodeConstraints.map((c) => c.node.toString());
    const removedEdgeIds = edgeConstraints.map((c) => c.target.id);
    const newNodes = nodes.filter((n) => !(n.id in removedNodeIds));
    newNodes.forEach((node) => {
      if (node.parentNode && node.parentNode in removedNodeIds) {
        node.parentNode = undefined;
      }
    });
    const newEdges = get().edges.filter((e) => !(e.id in removedEdgeIds));

    set({
      nodes: newNodes,
      edges: newEdges,
      unappliedConstraints: [
        ...get().unappliedConstraints,
        ...nodeConstraints,
        ...edgeConstraints,
      ],
    });
    await get().applyConstraints();
    await get().refreshLayout();
    if (nodeConstraints.length > 0) {
      analytics.track("deleteNodes", {
        nodes: nodeConstraints.map((c) => c.node),
      });
    }
    if (edgeConstraints.length > 0) {
      analytics.track("deleteEdges", {
        edges: edgeConstraints.map((c) => {
          return {
            source: c.target.sourceId,
            target: c.target.targetId,
          };
        }),
      });
    }
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
    if (!connection.source || !connection.target) {
      return;
    }
    const edge = new TopologyEdge(
      NodeId.parse(connection.source),
      NodeId.parse(connection.target),
    );
    const newConstraint = new EdgeConstraint(
      ConstraintOperator.MustExist,
      edge,
    );
    set({
      edges: addEdge(connection, get().edges),
      unappliedConstraints: [...get().unappliedConstraints, newConstraint],
    });
    await get().applyConstraints();
    await get().refreshLayout();
    analytics.track("onConnect", {
      source: edge.sourceId,
      target: edge.targetId,
    });
    console.log("connected", connection);
  },
  onConnectStart: (event, { nodeId }) => {
    if (!nodeId) {
      return;
    }

    const { architectureVersion, validTargets } = get().edgeTargetState;
    if (
      architectureVersion !== get().architecture.version ||
      (architectureVersion === get().architecture.version &&
        !validTargets.has(nodeId))
    ) {
      // if we don't have valid targets for this node/version combination, update them
      get().updateEdgeTargets([NodeId.parse(nodeId)]);
    }
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
    if (!nodeId) {
      return;
    }
    let resourceId: NodeId | undefined;
    set(
      {
        nodes: get().nodes.map((node) => {
          if (node.id === nodeId) {
            node.data = { ...node.data, isSelected: false };
            resourceId = node.data.resourceId;
          }
          return node;
        }),
        selectedNode: undefined,
      },
      undefined,
      "editor/deselectNode:deselectNode",
    );
    if (
      get().selectedResource &&
      get().selectedResource?.toString() === resourceId?.toString()
    ) {
      set(
        {
          selectedResource: undefined,
        },
        undefined,
        "editor/deselectNode:deselectResource",
      );
    }

    get().navigateRightSidebar([
      RightSidebarTabs.Changes,
      get().rightSidebarSelector[1],
    ]);
    console.log("deselected node", nodeId);
  },
  selectResource: (resourceId: NodeId) => {
    const node = resourceId
      ? get().nodes?.find((n) => n.data?.resourceId?.equals(resourceId))
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
    analytics.track("selectResource", {
      ...resourceId,
    });
  },
  deselectResource: (resourceId: NodeId) => {
    if (get().selectedResource?.equals(resourceId)) {
      set(
        {
          selectedResource: undefined,
        },
        false,
        "editor/deselectResource",
      );
    }
  },
  refreshArchitecture: async (architectureId?: string, version?: number) => {
    architectureId = architectureId ?? get().architecture?.id;
    version = version ?? get().architecture?.version;
    if (!architectureId) {
      throw new Error("no architecture id");
    }
    const architecture = await getArchitecture(
      architectureId,
      await get().getIdToken(),
      version,
    );
    const resourceTypeKB = await get().getResourceTypeKB(architectureId, true);
    const elements = toReactFlowElements(
      architecture,
      resourceTypeKB,
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
      "editor/refreshArchitecture",
    );
    console.log("architecture refreshed");
    get().updateEdgeTargets();
  },
  initializeEditor: async (architectureId: string, version?: number) => {
    if (get().isEditorInitializing) {
      return;
    }
    set(
      {
        isEditorInitializing: true,
      },
      false,
      "editor/initializeEditor:start",
    );
    get().resetEditorState({ isEditorInitializing: true });
    try {
      await get().refreshArchitecture(architectureId, version);
      set(
        {
          isEditorInitializing: false,
          isEditorInitialized: true,
        },
        false,
        "editor/initializeEditor:end",
      );
      console.log("editor initialized");
    } catch (e: any) {
      set(
        {
          isEditorInitializing: false,
          isEditorInitialized: false,
        },
        false,
        "editor/initializeEditor:error",
      );
      throw e;
    }
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
      elements.nodes
        ?.map((node) => {
          let nodeConstraints: Constraint[] = [
            new ApplicationConstraint(
              ConstraintOperator.Add,
              node.data.resourceId,
            ),
          ];
          if (node.parentNode) {
            nodeConstraints.push(
              new EdgeConstraint(
                ConstraintOperator.MustExist,
                new TopologyEdge(
                  node.data.resourceId,
                  nodes.find((n) => n.id === node.parentNode)?.data?.resourceId,
                ),
              ),
            );
          }
          const constraintsModifier =
            customConfigMappings[node.data.resourceId.qualifiedType]
              ?.creationConstraintsModifier;
          if (constraintsModifier) {
            nodeConstraints =
              constraintsModifier(node, get().architecture, nodeConstraints) ??
              nodeConstraints;
          }
          return nodeConstraints;
        })
        .flat() ?? [];
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
    if (nodeConstraints.length > 0) {
      analytics.track("addNodes", {
        nodes: nodeConstraints
          .filter((c) => c instanceof ApplicationConstraint)
          .map((c) => (c as ApplicationConstraint).node),
      });
    }
    const newEdges = [
      ...nodeConstraints
        .filter((c) => c instanceof EdgeConstraint)
        .map((c) => (c as EdgeConstraint).target),
      ...edgeConstraints.map((c) => c.target),
    ].map((e) => {
      return { source: e.sourceId, target: e.targetId };
    });
    if (newEdges.length > 0) {
      analytics.track("addEdges", {
        edges: newEdges,
      });
    }
    await get().applyConstraints();
  },
  applyConstraints: async (constraints?: Constraint[]) => {
    if (!get().canApplyConstraints) {
      throw new Error("cannot apply constraints, already applying");
    }
    const architecture = get().architecture;
    if (!architecture) {
      throw new Error("cannot apply constraints, no architecture in context");
    }

    let navigateToChanges = true;

    try {
      set(
        {
          canApplyConstraints: false,
        },
        false,
        "editor/applyConstraints:start",
      );
      const allConstraints = [
        ...get().unappliedConstraints,
        ...(constraints ?? []),
      ];
      console.log("applying constraints", allConstraints);

      const response = await applyConstraints(
        architecture.id,
        architecture.version,
        allConstraints,
        await get().getIdToken(),
      );
      console.log("response from apply constraints", response);
      // TODO: look into enabling this again once we have decisions in the engine again
      // if (newArchitecture.failures.length > 0) {
      //   console.log(newArchitecture.failures);
      //   const failures = [
      //     new Failure(get().unappliedConstraints, newArchitecture.failures),
      //   ];
      //   console.log("failures that we should be setting", failures);
      //   await get().refreshArchitecture(get().architecture.id);
      //   set(
      //     {
      //       unappliedConstraints: [],
      //       canApplyConstraints: true,
      //       failures: failures,
      //     },
      //     false,
      //     "editor/applyConstraints:error",
      //   );
      //   return;
      // }
      if (response.errorType == ApplyConstraintsErrorType.ConfigValidation) {
        navigateToChanges = false;
        set(
          {
            canApplyConstraints: true,
          },
        );
        return response.architecture.config_errors ?? [];
      }

      console.log("new architecture", response.architecture);
      const elements = toReactFlowElements(
        response.architecture!,
        await get().getResourceTypeKB(response.architecture.id),
        ArchitectureView.DataFlow,
      );
      const result = await autoLayout(
        elements.nodes,
        elements.edges,
        get().layoutOptions,
      );
      // TODO: look into enabling this again once we have decisions in the engine again
      // const decision = new Decision(
      //   get().unappliedConstraints,
      //   newArchitecture.decisions,
      // );

      // temporary workaround for decisions
      const groupByKey = (list: any[], key: string) =>
        list.reduce(
          (hash, obj) => ({
            ...hash,
            [obj[key]]: (hash[obj[key]] || []).concat(obj),
          }),
          {},
        );
      const constraintsByScope = groupByKey(allConstraints, "scope");
      const decisions = Object.entries(constraintsByScope)
        .map(([scope, constraints]) => {
          constraints = constraints as Constraint[];
          if (scope === ConstraintScope.Resource) {
            const uniqueResourceConstraints = [
              ...new Map(
                (constraints as ResourceConstraint[]).map((item) => [
                  item.target.toString(),
                  item,
                ]),
              ).values(),
            ];
            return uniqueResourceConstraints.map(
              (c) => new Decision([c], architecture.decisions),
            );
          }
          return [
            new Decision(constraints as Constraint[], architecture.decisions),
          ];
        })
        .flat();

      set(
        {
          nodes: result.nodes,
          edges: result.edges,
          decisions: decisions.concat(get().decisions),
          failures: [],
          unappliedConstraints: [],
          canApplyConstraints: true,
          edgeTargetState: initialState().edgeTargetState,
          architecture: response.architecture,
        },
        false,
        "editor/applyConstraints:end",
      );
      console.log("new nodes", elements.nodes);
      get().updateEdgeTargets();
      return response.architecture.config_errors ?? [];
    } catch (e) {
      console.error("error applying constraints", e);
      await get().refreshArchitecture(get().architecture.id);
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
      return [];
    } finally {
      if (navigateToChanges) {
        get().navigateRightSidebar([
          RightSidebarTabs.Changes,
          get().rightSidebarSelector[1],
        ]);
      }
    }
  },
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
    get().deselectResource(get().selectedResource ?? NodeId.parse(""));
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
    const edge = get().edges.find((e) => e.data.isSelected)?.data?.edgeSection;
    analytics.track("selectEdge", {
      source: NodeId.parse(edge?.incomingShape),
      target: NodeId.parse(edge?.outgoingShape),
    });
  },
  replaceResource: async (oldId: NodeId, newId: NodeId) => {
    if (oldId.equals(newId)) {
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
    analytics.track("replaceResource", {
      old: oldId,
      new: newId,
    });
    await get().applyConstraints();
  },
  navigateRightSidebar: (selector: RightSidebarTabSelector) => {
    set(
      {
        rightSidebarSelector: selector,
      },
      false,
      "editor/navigateRightSidebar",
    );
  },
  getResourceTypeKB: async (architectureId: string, refresh?: boolean) => {
    if (
      get().resourceTypeKB.getResourceTypes().length !== 0 &&
      !(refresh ?? false)
    ) {
      return get().resourceTypeKB;
    }

    const types = await getResourceTypes(
      architectureId,
      await get().getIdToken(),
    );
    types.applyCustomizations();

    set(
      {
        resourceTypeKB: types,
      },
      false,
      "editor/getResourceTypeKB",
    );
    return types;
  },
  setIsEditorInitialized: (isEditorInitialized: boolean) => {
    set(
      {
        isEditorInitialized,
      },
      false,
      "editor/setIsEditorInitialized",
    );
  },
  renameArchitecture: async (newName: string) => {
    const architecture = get().architecture;
    architecture.name = newName;
    const idToken = await get().getIdToken();
    const newArchitecture = await modifyArchitecture({
      name: newName,
      id: architecture.id,
      idToken,
    });

    set(
      {
        architecture: newArchitecture,
      },
      false,
      "editor/renameArchitecture",
    );
  },
  updateEdgeTargets: async (sources) => {
    let architecture = get().architecture;
    const idToken = await get().getIdToken();
    set(
      {
        edgeTargetState: {
          ...get().edgeTargetState,
          updating: true,
        },
      },
      false,
      "editor/updateEdgeTargets:start",
    );
    // if no sources are provided, allow refresh all using the backend cache
    const isPartial = sources && sources.length > 0;
    try {
      const response = await getValidEdgeTargets(
        architecture.id,
        architecture.version,
        {
          resources: { sources },
          tags: ["big", "parent"],
        },
        idToken,
      );

      const { validTargets, architectureVersion, architectureId } = response;

      architecture = get().architecture;
      if (architectureId !== architecture.id) {
        console.log("architecture id mismatch, ignoring");
        set(
          {
            edgeTargetState: {
              ...get().edgeTargetState,
              updating: false,
            },
          },
          false,
          "editor/updateEdgeTargets:idMismatch",
        );
        return;
      }
      if (architectureVersion !== architecture.version) {
        console.log("architecture version mismatch, ignoring");
        set(
          {
            edgeTargetState: {
              ...get().edgeTargetState,
              updating: false,
            },
          },
          false,
          "editor/updateEdgeTargets:versionMismatch",
        );
        return;
      }

      if (isPartial) {
        const oldValidTargets = get().edgeTargetState.validTargets;
        oldValidTargets.forEach((targets, sourceId) => {
          if (!validTargets.has(sourceId)) {
            validTargets.set(sourceId, targets);
          }
        });
      }

      // filter out edges that already exist in the dataflow/topology view
      const topologyEdges = get().edges;
      const existingEdges = new Map<string, string[]>();
      topologyEdges.forEach((edge) => {
        const sourceId = edge.source;
        if (validTargets.has(sourceId)) {
          const targets = validTargets.get(sourceId);
          if (targets) {
            validTargets.set(
              sourceId,
              targets.filter((t) => t !== edge.target),
            );
          }
        }
        existingEdges.set(sourceId, [
          ...(existingEdges.get(sourceId) ?? []),
          edge.target,
        ]);
      });

      set(
        {
          edgeTargetState: {
            updating: false,
            architectureVersion: architecture.version,
            engineVersion: architecture.engineVersion,
            validTargets: validTargets,
            existingEdges: existingEdges,
          },
        },
        false,
        "editor/updateEdgeTargets:end",
      );
      console.log("valid edge targets updated");
    } catch (e) {
      set(
        {
          edgeTargetState: {
            ...get().edgeTargetState,
            updating: false,
          },
        },
        false,
        "editor/updateEdgeTargets:error",
      );
      if (e instanceof ApplicationError) {
        return;
      }
      console.error("unhandled error updating valid edge targets", e);
    }
  },
  isValidConnection: (edge: Edge | Connection) => {
    const edges = get().edges;
    if (
      edges.find((e) => e.source === edge.source && e.target === edge.target)
    ) {
      // edge already exists
      return false;
    }

    const { validTargets, architectureVersion } = get().edgeTargetState;
    const architecture = get().architecture;
    if (architectureVersion !== architecture.version) {
      // we don't have valid targets for this version, so allow the connection and let the engine handle it
      return true;
    }

    const sourceId = edge.source;
    const targetId = edge.target;
    if (!sourceId || !targetId) {
      return false;
    }
    const targets = validTargets.get(sourceId);
    if (!targets) {
      return false;
    }
    return targets.includes(targetId);
  },
});
