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
  ReactFlowElements,
} from "../../shared/architecture/Architecture";
import { ArchitectureView } from "../../shared/architecture/Architecture";
import { getEnvironmentVersion } from "../../api/GetEnvironmentVersion";
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
} from "../../shared/architecture/Constraints";
import {
  applyConstraints,
  ApplyConstraintsErrorType,
} from "../../api/ApplyConstraints";
import TopologyEdge from "../../shared/architecture/TopologyEdge";
import { NodeId } from "../../shared/architecture/TopologyNode";
import type {
  NavHistory,
  RightSidebarTabSelector,
} from "../../shared/sidebar-nav";
import {
  getNextRelevantHistoryEntry,
  getPreviousRelevantHistoryEntry,
  RightSidebarDetailsTab,
  RightSidebarMenu,
} from "../../shared/sidebar-nav";
import { Decision } from "../../shared/architecture/Decision";
import { getResourceTypes } from "../../api/GetResourceTypes";
import type { AuthStoreBase } from "./AuthStore";
import { ResourceTypeKB } from "../../shared/resources/ResourceTypeKB";
import { type ErrorStore } from "./ErrorStore";

import { customConfigMappings } from "../ArchitectureEditor/config/CustomConfigMappings";
import { getValidEdgeTargets } from "../../api/GetValidEdgeTargets";
import { ApplicationError, EngineError } from "../../shared/errors";
import { getNextState } from "../../api/GetNextState";
import { getPrevState } from "../../api/GetPreviousState";
import { setCurrentState } from "../../api/SetCurrentState";
import modifyArchitecture from "../../api/ModifyArchitecture";
import { refreshSelection } from "../../shared/editor-util";
import type { ConfigurationError } from "../../shared/architecture/EnvironmentVersion";
import {
  type EnvironmentVersion,
  toReactFlowElements,
} from "../../shared/architecture/EnvironmentVersion";
import { getArchitecture } from "../../api/GetArchitecture";
import { env } from "../../shared/environment";
import type { UpdateArchitectureAccessRequest } from "../../api/UpdateArchitectureAccess";
import { updateArchitectureAccess } from "../../api/UpdateArchitectureAccess";
import { getArchitectureAccess } from "../../api/GetArchitectureAccess";
import type { ArchitectureAccess } from "../../shared/architecture/Access";
import cloneArchitecture from "../../api/CloneArchitecture";
import type { EditorViewSettings } from "../../shared/EditorViewSettings";
import {
  EditorLayout,
  isViewMode,
  ViewMode,
} from "../../shared/EditorViewSettings";
import { promoteToEnvironment } from "../../api/PromoteToEnvironment";
import exportIaC from "../../api/ExportIaC";

import type { ChangeNotification } from "../../components/editor/ChangesSidebar";
import type { SendChatMessageResponse } from "../../api/SendChatMessage";
import { sendChatMessage } from "../../api/SendChatMessage";
import type { ChatMessage } from "@azure/communication-react";
import { explainDiff } from "../../api/ExplainDiff";
import { type TopologyDiff } from "../../shared/architecture/TopologyDiff";
import { resolveMentions } from "../../shared/chat-util";
import type { ExtendedChatMessage } from "../../components/chat/ChatMessage.tsx";
import { NotificationType } from "../../components/editor/NotificationType.ts";
import { mention, MentionType } from "../../components/chat/MentionType.ts";
import analytics from "../../Analytics.ts";

interface EditorStoreState {
  architecture: Architecture;
  changeNotifications: ChangeNotification[];
  environmentVersion: EnvironmentVersion;
  previousState?: EnvironmentVersion;
  nextState?: EnvironmentVersion;
  willOverwriteState: boolean;
  canApplyConstraints: boolean;
  connectionSourceId?: string;
  chatHistory: ChatMessage[];
  deletingNodes: boolean;
  edges: Edge[];
  edgeTargetState: {
    environmentVersion: number;
    engineVersion: number;
    validTargets: Map<string, string[]>;
    existingEdges: Map<string, string[]>;
    updating: boolean;
  };
  editorSidebarState: {
    right: {
      isOpen: boolean;
      currentTab: RightSidebarMenu;
      detailsTab: {
        navHistory: NavHistory;
      };
    };
  };
  isEditorInitialized: boolean;
  isEditorInitializing: boolean;
  layoutOptions: LayoutOptions;
  layoutRefreshing: boolean;
  nodes: Node[];
  resourceTypeKB: ResourceTypeKB;
  rightSidebarSelector: RightSidebarTabSelector;
  selectedEdge?: string;
  selectedNode?: string;
  selectedResource?: NodeId;
  unappliedConstraints: Constraint[];
  architectureAccess?: ArchitectureAccess;
  viewSettings: EditorViewSettings;
}

const initialState: () => EditorStoreState = () => ({
  architecture: {} as Architecture,
  architectureAccess: undefined,
  changeNotifications: [],
  chatHistory: [],
  nodes: [],
  edges: [],
  configErrors: [],
  editorSidebarState: {
    right: {
      isOpen: false,
      currentTab: RightSidebarMenu.Changes,
      detailsTab: {
        navHistory: {
          maxHistoryLength: 100,
          currentIndex: undefined,
          entries: [],
        },
      },
    },
  },
  willOverwriteState: false,
  isEditorInitialized: false,
  isEditorInitializing: false,
  selectedNode: undefined,
  selectedEdge: undefined,
  selectedResource: undefined,
  layoutRefreshing: false,
  deletingNodes: false,
  layoutOptions: DefaultLayoutOptions,
  resourceTypeKB: new ResourceTypeKB(),
  environmentVersion: {} as EnvironmentVersion,
  canApplyConstraints: true,
  connectionSourceId: undefined,
  rightSidebarSelector: [undefined, RightSidebarDetailsTab.Config],
  unappliedConstraints: [],
  edgeTargetState: {
    environmentVersion: 0,
    engineVersion: 0,
    validTargets: new Map<string, string[]>(),
    existingEdges: new Map<string, string[]>(),
    updating: false,
  },
  viewSettings: {
    mode: ViewMode.Edit,
    layout: EditorLayout.Design,
  },
});

interface EditorStoreActions {
  addGraphElements: (
    elements: Partial<ReactFlowElements>,
    generateConstraints?: boolean,
  ) => Promise<void>;
  applyConstraints: (
    constraints?: Constraint[],
  ) => Promise<ConfigurationError[]>;
  cloneArchitecture: (name: string, architectureId: string) => Promise<string>;
  deleteElements: (elements: Partial<ReactFlowElements>) => Promise<void>;
  deselectEdge: (edgeId?: string) => void;
  deselectNode: (nodeId?: string) => void;
  deselectResource: (resourceId?: NodeId) => void;
  getResourceTypeKB: (
    architectureId: string,
    environment: string,
    refresh?: boolean,
  ) => Promise<ResourceTypeKB>;
  handleAuthCallback: (appState: any) => RedirectCallbackInvocation;
  initializeEditor: (
    id: string,
    environment?: string,
    version?: number,
  ) => Promise<void>;
  isValidConnection: IsValidConnection;
  navigateRightSidebar: (selector: RightSidebarTabSelector) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  selectNode: (nodeId?: string) => void;
  selectResource: (resourceId?: NodeId, forceNavigation?: boolean) => void;
  refreshLayout: () => Promise<void>;
  refreshArchitecture: (
    architectureId?: string,
    environment?: string,
    version?: number,
  ) => Promise<void>;
  replaceResource: (oldId: NodeId, newId: NodeId) => Promise<void>;
  resetEditorState: (newState?: Partial<EditorStoreState>) => void;
  selectEdge: (edgeId?: string) => void;
  setIsEditorInitialized: (isEditorInitialized: boolean) => void;
  updateArchitectureAccess: (
    request: UpdateArchitectureAccessRequest,
  ) => Promise<void>;
  getArchitectureAccess: (
    architectureId: string,
    summarized?: boolean,
  ) => Promise<ArchitectureAccess>;
  renameArchitecture: (newName: string) => Promise<void>;
  updateEdgeTargets: (sources?: NodeId[]) => Promise<void>;
  navigateBackRightSidebar: () => void;
  navigateForwardRightSidebar: () => void;
  goToPreviousState: () => Promise<void>;
  goToNextState: () => Promise<void>;
  updateViewSettings: (settings: Partial<EditorViewSettings>) => void;
  promoteToEnvironment: (targetEnvironmentId: string) => Promise<void>;
  exportIaC: (
    architectureId: string,
    environment: string,
    state?: number,
  ) => Promise<any>;
  sendChatMessage: (message: string) => Promise<void>;
  clearChatHistory: () => void;
  replyInChat: (
    response: Partial<ExtendedChatMessage>[],
    originalMessageId?: string,
    updates?: Partial<ExtendedChatMessage>,
  ) => void;
  explainDiff: (diff: any) => Promise<void>;
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

    set(
      {
        selectedNode: undefined,
        selectedResource: undefined,
        selectedEdge: undefined,
        unappliedConstraints: [
          ...get().unappliedConstraints,
          ...nodeConstraints,
          ...edgeConstraints,
        ],
      },
      false,
      "editor/deleteElements",
    );
    await get().applyConstraints();
    if (nodeConstraints.length > 0) {
      analytics.track("deleteNodes", {
        nodes: nodeConstraints.map((c) => c.node.toString()),
      });
    }
    if (edgeConstraints.length > 0) {
      analytics.track("deleteEdges", {
        edges: edgeConstraints.map((c) => {
          return {
            source: c.target.sourceId.toString(),
            target: c.target.targetId.toString(),
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
      source: edge.sourceId.toString(),
      target: edge.targetId.toString(),
    });
    console.log("connected", connection);
  },
  onConnectStart: (event, { nodeId }) => {
    if (!nodeId) {
      return;
    }

    const { environmentVersion, validTargets } = get().edgeTargetState;
    if (
      environmentVersion !== get().environmentVersion.version ||
      (environmentVersion === get().environmentVersion.version &&
        !validTargets.has(nodeId))
    ) {
      // if we don't have valid targets for this node/version combination, update them
      get().updateEdgeTargets([NodeId.parse(nodeId)]);
    }
  },
  selectNode: (nodeId?: string) => {
    if (get().selectedNode === nodeId) {
      return;
    }
    get().deselectEdge(get().selectedEdge);
    get().deselectNode(get().selectedNode);

    if (!nodeId) {
      return;
    }

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
      RightSidebarMenu.Details,
      get().rightSidebarSelector[1],
    ]);
    console.log("selected node", nodeId);
  },
  deselectNode: (nodeId?: string) => {
    if (!nodeId) {
      nodeId = get().selectedNode;
    }
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

    get().navigateRightSidebar([undefined, get().rightSidebarSelector[1]]);
    console.log("deselected node", nodeId);
  },
  selectResource: (resourceId?: NodeId, forceNavigation?: boolean) => {
    if (
      !resourceId ||
      !get().environmentVersion.resources.has(resourceId?.toString())
    ) {
      return;
    }
    const node = resourceId
      ? get().nodes?.find((n) => n.data?.resourceId?.equals(resourceId))
      : undefined;
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
    get().selectNode(node?.id);
    if (node?.id && !forceNavigation) {
      return;
    }
    get().navigateRightSidebar([
      RightSidebarMenu.Details,
      get().rightSidebarSelector[1],
    ]);
  },
  deselectResource: (resourceId?: NodeId) => {
    const selectedResource = get().selectedResource;
    if (!resourceId) {
      resourceId = selectedResource;
    }
    if (selectedResource?.equals(resourceId)) {
      set(
        {
          selectedResource: undefined,
        },
        false,
        "editor/deselectResource",
      );
      get().deselectNode(get().selectedResource?.toString());
    }
  },
  refreshArchitecture: async (
    architectureId?: string,
    environment?: string,
    version?: number,
  ) => {
    const currentEnvironment = get().environmentVersion;
    architectureId = architectureId ?? get().architecture?.id;
    environment = environment ?? currentEnvironment.id;
    if (environment === currentEnvironment.id) {
      version = version ?? currentEnvironment?.version;
    }

    if (!architectureId) {
      throw new Error("no architecture id");
    }
    const architecture = await getArchitecture(
      architectureId,
      await get().getIdToken(),
    );
    environment = environment ?? architecture.defaultEnvironment;
    console.log("refresh got architecture", architecture);
    const ev = await getEnvironmentVersion(
      architectureId,
      await get().getIdToken(),
      environment,
      version,
    );
    console.log("refresh got environment version", ev);
    const resourceTypeKB = await get().getResourceTypeKB(
      architectureId,
      environment,
      true,
    );
    const elements = toReactFlowElements(
      ev,
      resourceTypeKB,
      ArchitectureView.DataFlow,
    );
    const { nodes, edges } = await autoLayout(
      ev,
      elements.nodes,
      elements.edges,
    );
    (async () => {
      const nextState = await getNextState(
        ev.architecture_id,
        ev.id,
        await get().getIdToken(),
        ev.version,
      );
      const prevState = await getPrevState(
        ev.architecture_id,
        ev.id,
        await get().getIdToken(),
        ev.version,
      );
      set({
        nextState: nextState,
        previousState: prevState,
        willOverwriteState: nextState === undefined,
      });
    })();
    const { selectedNode, selectedEdge, selectedResource } = refreshSelection({
      environmentVersion: ev,
      nodes,
      edges,
      selectedNode: get().selectedNode,
      selectedEdge: get().selectedEdge,
      selectedResource: get().selectedResource,
    });

    const viewSettings = { ...get().viewSettings };

    const canWrite = get().architectureAccess?.canWrite;

    if (!isViewMode(viewSettings, ViewMode.View) && canWrite) {
      viewSettings.mode =
        architecture.defaultEnvironment === ev.id
          ? ViewMode.Edit
          : ViewMode.Configure;
    } else {
      viewSettings.mode = ViewMode.View;
    }

    set(
      {
        architecture,
        environmentVersion: ev,
        nodes,
        edges,
        selectedNode,
        selectedEdge,
        selectedResource,
        viewSettings,
      },
      false,
      "editor/refreshArchitecture",
    );
    console.log("architecture refreshed");
    get().updateEdgeTargets();
  },
  initializeEditor: async (
    architectureId: string,
    environment?: string,
    version?: number,
  ) => {
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
      await get().refreshArchitecture(architectureId, environment, version);
      const architectureAccess = await get().getArchitectureAccess(
        architectureId,
        true,
      );
      set(
        {
          viewSettings: {
            ...get().viewSettings,
            mode:
              architectureAccess?.canWrite ||
              (get().user &&
                get().architecture.owner === `user:${get().user?.sub}`)
                ? "edit"
                : "view",
          },
          architectureAccess,
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
        get().environmentVersion,
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
              constraintsModifier(
                node,
                get().environmentVersion,
                nodeConstraints,
              ) ?? nodeConstraints;
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
          .map((c) => (c as ApplicationConstraint).node.toString()),
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
        edges: newEdges.map((e) => {
          return {
            source: e.source.toString(),
            target: e.target.toString(),
          };
        }),
      });
    }
    await get().applyConstraints();
  },
  applyConstraints: async (constraints?: Constraint[]) => {
    if (!get().canApplyConstraints) {
      throw new Error("cannot apply constraints, already applying");
    }

    const ev = get().environmentVersion;
    if (!ev) {
      throw new Error(
        "cannot apply constraints, no environment version in context",
      );
    }
    console.log(ev);

    let navigateToChanges = true;

    const allConstraints = [
      ...get().unappliedConstraints,
      ...(constraints ?? []),
    ];

    try {
      set(
        {
          canApplyConstraints: false,
        },
        false,
        "editor/applyConstraints:start",
      );

      console.log("applying constraints", allConstraints);

      const response = await applyConstraints(
        ev.architecture_id,
        ev.id,
        ev.version,
        allConstraints,
        await get().getIdToken(),
        get().willOverwriteState,
      );
      console.log("response from apply constraints", response);
      if (response.errorType == ApplyConstraintsErrorType.ConfigValidation) {
        navigateToChanges = false;
        set({
          canApplyConstraints: true,
        });
        return response.environmentVersion?.config_errors ?? [];
      }

      if (!response.environmentVersion) {
        return [];
      }

      console.log("new environment version", response.environmentVersion);
      const elements = toReactFlowElements(
        response.environmentVersion!,
        await get().getResourceTypeKB(
          response.environmentVersion.architecture_id,
          response.environmentVersion.id,
        ),
        ArchitectureView.DataFlow,
      );
      const result = await autoLayout(
        response.environmentVersion,
        elements.nodes,
        elements.edges,
        get().layoutOptions,
      );
      const { selectedNode, selectedEdge, selectedResource } = refreshSelection(
        {
          environmentVersion: response.environmentVersion,
          nodes: result.nodes,
          edges: result.edges,
          selectedNode: get().selectedNode,
          selectedEdge: get().selectedEdge,
          selectedResource: get().selectedResource,
        },
      );

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
            return uniqueResourceConstraints.map((c) => new Decision([c], []));
          }
          return [new Decision(constraints as Constraint[], [])];
        })
        .flat();

      if (selectedEdge) {
        get().selectEdge(selectedEdge);
      } else if (selectedNode && !selectedResource) {
        get().selectNode(selectedNode);
      } else if (selectedResource) {
        get().selectResource(selectedResource);
      } else {
        get().deselectResource();
        get().deselectNode();
        get().deselectEdge();
      }

      set(
        {
          environmentVersion: response.environmentVersion,
          nodes: result.nodes,
          edges: result.edges,
          changeNotifications: get()
            .changeNotifications.filter(
              (n) => n.type !== NotificationType.Failure,
            )
            .concat(
              ...decisions.map((d) => ({
                title: d.formatTitle(),
                details: d.formatInfo(),
                type: NotificationType.Success,
                timestamp: Date.now(),
              })),
            ),
          unappliedConstraints: [],
          canApplyConstraints: true,
          edgeTargetState: initialState().edgeTargetState,
          previousState: get().environmentVersion,
          nextState: undefined,
          willOverwriteState: false,
        },
        false,
        "editor/applyConstraints:end",
      );
      console.log("new nodes", elements.nodes);
      get().updateEdgeTargets();
      return response.environmentVersion.config_errors ?? [];
    } catch (e) {
      console.error("error applying constraints", { e });
      await get().refreshArchitecture(
        get().environmentVersion.architecture_id,
        get().environmentVersion.id,
      );
      const notifications: ChangeNotification[] = [];
      if (e instanceof EngineError) {
        notifications.push({
          title: e.title,
          details: e.details,
          type: NotificationType.Failure,
          timestamp: Date.now(),
        });
      } else {
        const constraints = get().unappliedConstraints;
        const title = constraints
          .map((c) => c.toFailureMessage())
          .join(", ")
          .replace(/:$/g, "");
        const details =
          "The Klotho engine ran into an unexpected issue, the team was notified and is investigating, please try again. If this keeps occurring please join us on discord";
        notifications.push({
          title,
          details,
          type: NotificationType.Failure,
          timestamp: Date.now(),
        });
      }

      set(
        {
          unappliedConstraints: [],
          canApplyConstraints: true,
          changeNotifications: get().changeNotifications.concat(
            ...notifications,
          ),
        },
        false,
        "editor/applyConstraints:error",
      );
      return [];
    } finally {
      if (navigateToChanges) {
        get().navigateRightSidebar([
          RightSidebarMenu.Changes,
          get().rightSidebarSelector[1],
        ]);
      }
    }
  },
  deselectEdge: (edgeId?: string) => {
    if (!edgeId) {
      edgeId = get().selectedEdge;
    }
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
  selectEdge: (edgeId?: string) => {
    get().deselectEdge(get().selectedEdge);
    get().deselectNode(get().selectedNode);
    get().deselectResource(get().selectedResource);
    get().navigateRightSidebar([
      RightSidebarMenu.Details,
      RightSidebarDetailsTab.AdditionalResources,
    ]);

    if (!edgeId) {
      return;
    }

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
      source: edge?.incomingShape,
      target: edge?.outgoingShape,
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
      "editor/replaceResource",
    );
    analytics.track("replaceResource", {
      old: oldId.toString(),
      new: newId.toString(),
    });
    await get().applyConstraints();
    const failure = get().changeNotifications.find(
      (n) => n.type === NotificationType.Failure,
    );
    if (!failure) {
      get().selectResource(newId);
    }
  },
  navigateRightSidebar: (selector: RightSidebarTabSelector) => {
    const sidebarState = get().editorSidebarState;
    const navHistory = sidebarState.right.detailsTab.navHistory;
    const selectedResource = get().selectedResource;
    let historyEntries = navHistory.entries;

    if (selector[0] === RightSidebarMenu.Details && selectedResource) {
      historyEntries = [...navHistory.entries];
      if (
        navHistory.currentIndex &&
        historyEntries.length - 1 > navHistory.currentIndex
      ) {
        historyEntries = historyEntries.slice(0, navHistory.currentIndex + 1);
      }
      historyEntries.push({
        tab: get().rightSidebarSelector[1],
        resourceId: get().selectedResource,
        index: historyEntries.length,
      });
      if (
        navHistory.maxHistoryLength &&
        historyEntries.length > navHistory.maxHistoryLength
      ) {
        const startIndex = historyEntries.length - navHistory.maxHistoryLength;
        historyEntries = historyEntries.slice(startIndex);
      }
    }
    set(
      {
        rightSidebarSelector: selector,
        editorSidebarState: {
          ...sidebarState,
          currentTab: selector[0],
          right: {
            ...sidebarState.right,
            detailsTab: {
              ...sidebarState.right.detailsTab,
              navHistory: {
                ...navHistory,
                currentIndex: historyEntries.length - 1,
                entries: historyEntries,
              },
            },
          },
        },
      },
      false,
      "editor/navigateRightSidebar",
    );
  },
  navigateBackRightSidebar: () => {
    // go back one entry in the history. if we're at the beginning, do nothing. if the resource is no longer in the graph, continue going back until we find an entry with one that is.
    const sidebarState = get().editorSidebarState;
    const navHistory = sidebarState.right.detailsTab.navHistory;
    const rightSidebarSelector = get().rightSidebarSelector;
    const selectedResource = get().selectedResource;
    const newEntry = getPreviousRelevantHistoryEntry(
      navHistory,
      rightSidebarSelector,
      selectedResource,
      get().environmentVersion,
    );

    if (!newEntry) {
      return;
    }

    set(
      {
        rightSidebarSelector: [RightSidebarMenu.Details, newEntry.tab],
        selectedResource: newEntry.resourceId,
        editorSidebarState: {
          ...sidebarState,
          right: {
            ...sidebarState.right,
            detailsTab: {
              ...sidebarState.right.detailsTab,
              navHistory: {
                ...navHistory,
                currentIndex: newEntry.index,
              },
            },
          },
        },
      },
      false,
      "editor/navigateBackRightSidebar",
    );
  },
  navigateForwardRightSidebar: () => {
    // go forward one entry in the history. if we're at the end, do nothing.
    const sidebarState = get().editorSidebarState;
    const navHistory = sidebarState.right.detailsTab.navHistory;
    const rightSidebarSelector = get().rightSidebarSelector;
    const selectedResource = get().selectedResource;
    const newEntry = getNextRelevantHistoryEntry(
      navHistory,
      rightSidebarSelector,
      selectedResource,
      get().environmentVersion,
    );

    if (!newEntry) {
      return;
    }

    set(
      {
        rightSidebarSelector: [RightSidebarMenu.Details, newEntry.tab],
        selectedResource: newEntry.resourceId,
        editorSidebarState: {
          ...sidebarState,
          right: {
            ...sidebarState.right,
            detailsTab: {
              ...sidebarState.right.detailsTab,
              navHistory: {
                ...navHistory,
                currentIndex: newEntry.index,
              },
            },
          },
        },
      },
      false,
      "editor/navigateForwardRightSidebar",
    );
  },
  getResourceTypeKB: async (
    architectureId: string,
    environment: string,
    refresh?: boolean,
  ) => {
    if (
      get().resourceTypeKB.getResourceTypes().length !== 0 &&
      !(refresh ?? false)
    ) {
      return get().resourceTypeKB;
    }

    const types = await getResourceTypes(
      architectureId,
      environment,
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
    newArchitecture.defaultEnvironment = architecture.defaultEnvironment;
    newArchitecture.environments = architecture.environments;
    set(
      {
        architecture: newArchitecture,
      },
      false,
      "editor/renameArchitecture",
    );
  },
  updateEdgeTargets: async (sources) => {
    let environmentVersion = get().environmentVersion;
    console.log(environmentVersion);
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
        environmentVersion.architecture_id,
        environmentVersion.id,
        environmentVersion.version,
        {
          resources: { sources },
          tags: ["big", "parent"],
        },
        idToken,
      );

      const { validTargets, architectureVersion, architectureId, environment } =
        response;

      environmentVersion = get().environmentVersion;
      if (architectureId !== environmentVersion.architecture_id) {
        console.log(
          "architecture id mismatch, ignoring",
          architectureId,
          environmentVersion.architecture_id,
        );
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
      if (environment !== environmentVersion.id) {
        console.log("environment id mismatch, ignoring");
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
      if (architectureVersion !== environmentVersion.version) {
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
            environmentVersion: environmentVersion.version,
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

    if (env.debug.has("disableEdgeTargetValidation")) {
      return true;
    }

    const { validTargets, environmentVersion } = get().edgeTargetState;
    const ev = get().environmentVersion;
    if (environmentVersion !== ev.version) {
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
  goToPreviousState: async (): Promise<void> => {
    const prev = get().previousState!;
    const resourceTypeKB = await get().resourceTypeKB;
    const elements = toReactFlowElements(
      prev,
      resourceTypeKB,
      ArchitectureView.DataFlow,
    );
    const { nodes, edges } = await autoLayout(
      prev,
      elements.nodes,
      elements.edges,
    );
    const { selectedNode, selectedEdge, selectedResource } = refreshSelection({
      environmentVersion: prev,
      nodes,
      edges,
      selectedNode: get().selectedNode,
      selectedEdge: get().selectedEdge,
      selectedResource: get().selectedResource,
    });
    set({
      environmentVersion: prev,
      nextState: get().environmentVersion,
      willOverwriteState: true,
      nodes,
      edges,
      selectedEdge,
      selectedNode,
      selectedResource,
    });
    console.log("previous", prev);
    try {
      await setCurrentState(
        get().environmentVersion.architecture_id,
        get().environmentVersion.id,
        await get().getIdToken(),
        get().previousState!.version,
      );
      const newPrev = await getPrevState(
        get().environmentVersion.architecture_id,
        get().environmentVersion.id,
        await get().getIdToken(),
        get().previousState!.version,
      );
      set({
        previousState: newPrev,
      });
    } catch (e) {
      set({
        previousState: undefined,
      });
    }
  },
  goToNextState: async (): Promise<void> => {
    const next = get().nextState!;
    const resourceTypeKB = await get().resourceTypeKB;
    const elements = toReactFlowElements(
      next,
      resourceTypeKB,
      ArchitectureView.DataFlow,
    );
    const { nodes, edges } = await autoLayout(
      next,
      elements.nodes,
      elements.edges,
    );
    const { selectedNode, selectedEdge, selectedResource } = refreshSelection({
      environmentVersion: next,
      nodes,
      edges,
      selectedNode: get().selectedNode,
      selectedEdge: get().selectedEdge,
      selectedResource: get().selectedResource,
    });
    set({
      environmentVersion: next,
      previousState: get().environmentVersion,
      nodes,
      edges,
      selectedEdge,
      selectedNode,
      selectedResource,
    });
    console.log("prev at next", get().previousState);
    try {
      await setCurrentState(
        get().environmentVersion.architecture_id,
        get().environmentVersion.id,
        await get().getIdToken(),
        get().nextState!.version,
      );
      const newNext = await getNextState(
        get().environmentVersion.architecture_id,
        get().environmentVersion.id,
        await get().getIdToken(),
        get().nextState!.version,
      );
      set({
        nextState: newNext,
        willOverwriteState: newNext !== undefined,
      });
    } catch (e) {
      set({
        nextState: undefined,
      });
    }
  },
  updateArchitectureAccess: async (
    request: UpdateArchitectureAccessRequest,
  ) => {
    const idToken = await get().getIdToken();
    await updateArchitectureAccess(request, idToken);
    const access = await get().getArchitectureAccess(request.architectureId);
    set(
      {
        architectureAccess: access,
      },
      false,
      "editor/updateArchitectureAccess",
    );
  },
  getArchitectureAccess: async (
    architectureId: string,
    summarized?: boolean,
  ) => {
    const idToken = await get().getIdToken();
    return await getArchitectureAccess({ architectureId, summarized }, idToken);
  },
  updateViewSettings: (settings: Partial<EditorViewSettings>) => {
    set(
      {
        viewSettings: {
          ...get().viewSettings,
          ...settings,
        },
      },
      false,
      "editor/updateViewSettings",
    );
  },
  cloneArchitecture: async (name: string, architectureId): Promise<string> => {
    const idToken = await get().getIdToken();
    const newArchitecture = await cloneArchitecture({
      id: architectureId,
      idToken,
      name,
    });
    console.log("cloned architecture", newArchitecture);
    return newArchitecture.id;
  },
  handleAuthCallback: (appState: any): RedirectCallbackInvocation => {
    switch (appState?.action) {
      case "clone": {
        return {
          workingMessage: `Making a copy of "${appState.architecture.name}" ...`,
          invocation: (async (): Promise<RedirectCallbackResult> => {
            const architectureId = await get().cloneArchitecture(
              `Copy of ${appState.architecture.name}`,
              appState.architecture.id,
            );
            return {
              navigateTo: `/editor/${architectureId}`,
            };
          })(),
        };
      }
      default:
        return {
          workingMessage: "Initializing editor...",
          invocation: Promise.resolve({}),
        };
    }
  },
  promoteToEnvironment: async (targetEnvironmentId: string) => {
    let notification: any;
    try {
      await promoteToEnvironment({
        architectureId: get().architecture.id,
        targetEnvironmentId,
        idToken: await get().getIdToken(),
      });
      notification = {
        title: `Promoted architecture from default to ${targetEnvironmentId}`,
        type: NotificationType.Success,
        timestamp: Date.now(),
      };
    } catch (e) {
      console.error("error promoting to environment", e);
      notification = {
        title: `Promoting architecture to ${targetEnvironmentId} failed!`,
        type: NotificationType.Failure,
        timestamp: Date.now(),
      };
    } finally {
      set(
        {
          changeNotifications: get()
            .changeNotifications.filter(
              (n) => n.type !== NotificationType.Failure,
            )
            .concat(notification),
        },
        false,
        "editor/promoteToEnvironment",
      );
      get().navigateRightSidebar([
        RightSidebarMenu.Changes,
        get().rightSidebarSelector[1],
      ]);
    }
  },
  exportIaC: async (
    architectureId: string,
    environment: string,
    state?: number,
  ) => {
    const idToken = await get().getIdToken();
    return await exportIaC(architectureId, environment, state ?? null, idToken);
  },
  sendChatMessage: async (message: string): Promise<void> => {
    const idToken = await get().getIdToken();
    const pattern = /<msft-mention id="[^#]*#([^"]*)">([^<]*)<\/msft-mention>/g;
    const sanitizedMessage = message.replace(pattern, "$2");
    const messageId = crypto.randomUUID().toString();
    const user = get().user;
    const historyEntry = {
      messageId: messageId,
      senderId: "user",
      senderDisplayName:
        user?.displayName ||
        user?.name ||
        user?.nickname ||
        user?.preferred_username ||
        user?.given_name ||
        "User",
      content: message,
      createdOn: new Date(),
      contentType: "richtext/html",
      messageType: "chat",
      status: "sending",
      attached: false,
      environment: {
        id: get().environmentVersion.id,
        version: get().environmentVersion.version,
      },
    } satisfies ExtendedChatMessage;

    set(
      {
        chatHistory: get().chatHistory.concat(historyEntry),
      },
      false,
      "editor/sendChatMessage:start",
    );

    let response: SendChatMessageResponse;

    console.log(get().chatHistory);
    try {
      response = await sendChatMessage({
        architectureId: get().architecture.id,
        environmentId: get().environmentVersion.id,
        previousMessages: get()
          .chatHistory.filter(
            (m) => m.senderId && m.content && m.messageId !== "intro",
          )
          .slice(Math.max(get().chatHistory.length - 10, 0))
          .map((m) => {
            return {
              role: m.senderId!,
              content:
                m.contentType === "text"
                  ? (m.content ?? "")
                  : resolveMentions(m.content ?? ""),
            };
          }),
        message: sanitizedMessage,
        idToken,
        version: get().environmentVersion.version,
      });
    } catch (e: any) {
      const notifications: ChangeNotification[] = [];
      if (e instanceof EngineError) {
        notifications.push({
          title: e.title,
          details: e.details,
          type: NotificationType.Failure,
          timestamp: Date.now(),
        });
      } else {
        notifications.push({
          title: `message failed: "${message}"`,
          type: NotificationType.Failure,
          timestamp: Date.now(),
        });
      }
      console.error(notifications);

      set(
        {
          unappliedConstraints: [],
          canApplyConstraints: true,
          changeNotifications: get().changeNotifications.concat(
            ...notifications,
          ),
        },
        false,
        "editor/sendChatMessage:error",
      );
      get().replyInChat(
        [
          {
            content: NodeId.mentionAll(e.title || e.message),
          },
        ],
        messageId,
        {
          status: "failed",
        },
      );
      return;
    }

    if (response.errorType === ApplyConstraintsErrorType.ConfigValidation) {
      set({
        canApplyConstraints: true,
      });
      return;
    }

    let decisions: Decision[] = [];
    if (response.environmentVersion) {
      console.log("new environment version", response.environmentVersion);
      const elements = toReactFlowElements(
        response.environmentVersion!,
        await get().getResourceTypeKB(
          response.environmentVersion.architecture_id,
          response.environmentVersion.id,
        ),
        ArchitectureView.DataFlow,
      );
      const result = await autoLayout(
        response.environmentVersion,
        elements.nodes,
        elements.edges,
        get().layoutOptions,
      );
      const { selectedNode, selectedEdge, selectedResource } = refreshSelection(
        {
          environmentVersion: response.environmentVersion,
          nodes: result.nodes,
          edges: result.edges,
          selectedNode: get().selectedNode,
          selectedEdge: get().selectedEdge,
          selectedResource: get().selectedResource,
        },
      );

      if (selectedEdge) {
        get().selectEdge(selectedEdge);
      } else if (selectedNode && !selectedResource) {
        get().selectNode(selectedNode);
      } else if (selectedResource) {
        get().selectResource(selectedResource);
      } else {
        get().deselectResource();
        get().deselectNode();
        get().deselectEdge();
      }

      const groupByKey = (list: any[], key: string) =>
        list.reduce(
          (hash, obj) => ({
            ...hash,
            [obj[key]]: (hash[obj[key]] || []).concat(obj),
          }),
          {},
        );
      const generatedConstraints = response.constraints;
      const constraintsByScope = groupByKey(generatedConstraints, "scope");
      decisions = Object.entries(constraintsByScope)
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
            return uniqueResourceConstraints.map((c) => new Decision([c], []));
          }
          return [new Decision(constraints as Constraint[], [])];
        })
        .flat();

      set(
        {
          environmentVersion: response.environmentVersion,
          nodes: result.nodes,
          edges: result.edges,
          changeNotifications: get()
            .changeNotifications.filter(
              (n) => n.type !== NotificationType.Failure,
            )
            .concat(
              ...decisions.map((d) => ({
                title: d.formatTitle(),
                details: d.formatInfo(),
                type: NotificationType.Success,
                timestamp: Date.now(),
              })),
            ),
          unappliedConstraints: [],
          canApplyConstraints: true,
          edgeTargetState: initialState().edgeTargetState,
          previousState: get().environmentVersion,
          nextState: undefined,
          willOverwriteState: false,
        },
        false,
        "editor/sendChatMessage:end",
      );
      console.log("new nodes", elements.nodes);
    }
    const responseId = crypto.randomUUID().toString();

    if (response.response) {
      get().replyInChat([
        {
          messageId: `${responseId}-helper`,
          content: response.response,
        },
      ]);
    }
    if (decisions.length) {
      get().replyInChat(
        // !decisions.length
        //   ? [
        //       {
        //         content: "I'm sorry, I don't understand your prompt. 🥺",
        //       },
        //     ]
        [
          {
            messageId: responseId,
            content:
              "Okay, here's what I've done:\n\n" +
              decisions
                .map((d) =>
                  d.formatTitle({
                    mentionResources: true,
                    forceBullet: true,
                  }),
                )
                .join("\n") +
              `\n${mention(MentionType.Explain, responseId, "Yes")}`,
            attached: "top",
          },
        ],
        messageId,
        {
          status: "delivered",
        },
      );
    }
    get().updateEdgeTargets();
  },
  clearChatHistory: () => {
    set(
      {
        chatHistory: [],
      },
      false,
      "editor/clearChatHistory",
    );
  },
  replyInChat: (
    response: Partial<ExtendedChatMessage>[],
    originalMessageId?: string,
    updates?: Partial<ExtendedChatMessage>,
  ) => {
    const environmentVersion = get().environmentVersion;

    response?.forEach((r) => {
      r.messageType = "chat";
      r.senderDisplayName = r.senderDisplayName || "Alfred";
      r.senderId = r.senderId || "assistant";
      r.createdOn = r.createdOn || new Date();
      r.messageId = r.messageId || crypto.randomUUID().toString();
      r.contentType = r.contentType || "richtext/html";
      r.status = r.status || "delivered";
      r.attached = r.attached || false;
      r.clientMessageId = r.clientMessageId || crypto.randomUUID().toString();
      r.environment = r.environment || {
        id: environmentVersion.id,
        version: environmentVersion.version,
      };
    });

    const chatHistory = [...get().chatHistory];

    // handle updates
    if (updates) {
      for (let i = 0; i < chatHistory.length; i++) {
        if (chatHistory[i].messageId === originalMessageId) {
          chatHistory[i] = { ...chatHistory[i], ...updates };
          break;
        }
      }
    }
    for (let i = 0; i < response.length; i++) {
      const existingIndex = chatHistory.findIndex(
        (m) => m.messageId === response[i].messageId,
      );
      if (existingIndex > -1) {
        // replace existing message
        chatHistory[existingIndex] = response[i] as ChatMessage;
      } else {
        chatHistory.push(response[i] as ChatMessage);
      }
    }
    set(
      {
        chatHistory,
      },
      false,
      "editor/replyInChat",
    );
  },
  explainDiff: async (diff: TopologyDiff) => {
    try {
      const explanation = await explainDiff({
        architectureId: get().architecture.id,
        environmentId: get().environmentVersion.id,
        diff: diff,
        version: get().environmentVersion.version,
        idToken: get().currentIdToken.idToken,
      });
      get().replyInChat([
        {
          content: NodeId.mentionAll(explanation),
          attached: true,
        },
      ]);
    } catch (e) {
      console.error("error explaining diff", e);
      get().replyInChat([
        {
          content: "I'm sorry, I'm having trouble with that right now. 🥺",
        },
      ]);
    }
  },
});

export interface RedirectCallbackInvocation {
  workingMessage?: string;
  invocation: Promise<RedirectCallbackResult>;
}

export interface RedirectCallbackResult {
  navigateTo?: string;
}
