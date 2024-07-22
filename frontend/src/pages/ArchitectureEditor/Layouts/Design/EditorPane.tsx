import type { Edge, Node } from "reactflow";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  useReactFlow,
  useStore,
} from "reactflow";
import NodeTypes, { NodeType } from "../../../../shared/reactflow/NodeTypes";
import EdgeTypes, {
  defaultEdgeOptions,
} from "../../../../shared/reactflow/EdgeTypes";
import type { MouseEvent as ReactMouseEvent } from "react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { NodeId } from "../../../../shared/architecture/TopologyNode";
import useApplicationStore from "../../../store/ApplicationStore";
import ContextMenu from "./ContextMenu";
import { WorkingOverlay } from "../../../../components/WorkingOverlay";
import { getIconMapping } from "../../../../shared/resources/ResourceMappings";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../../../../components/FallbackRenderer";
import { UIError } from "../../../../shared/errors";
import { trackError } from "../../../store/ErrorStore";
import { ConnectionLine } from "../../../../shared/reactflow/ConnectionLine";
import { shallow } from "zustand/shallow";
import classNames from "classnames";
import { VersionNavigator } from "./VersionNavigation";
import { canModifyConfiguration } from "../../../../shared/EditorViewSettings";

export default function EditorPane() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const {
    nodes,
    edges,
    isValidConnection,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    addGraphElements,
    canApplyConstraints,
    selectEdge,
    selectedNode,
    selectedEdge,
    deselectNode,
    deselectEdge,
    addError,
    viewSettings,
  } = useApplicationStore();

  const connectionNodeId = useStore((s) => s.connectionNodeId, shallow);
  const isConnecting = connectionNodeId !== null;

  const { fitView, getIntersectingNodes } = useReactFlow();

  const [oldNodeCount, setOldNodeCount] = useState<number>(nodes.length);
  const [oldEdgeCount, setOldEdgeCount] = useState<number>(edges.length);

  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  useEffect(() => {
    if (!canApplyConstraints) {
      setShowSpinner(true);
    } else {
      setTimeout(() => {
        setShowSpinner(false);
      }, 200);
    }
  }, [canApplyConstraints, setShowSpinner]);

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    async (event: any) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      console.log("dropped", type);

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      // TODO: use position to determine parent/child relationships (groupings)
      const position = reactFlowInstance?.project({
        x: event.clientX - (reactFlowBounds?.left ?? 0),
        y: event.clientY - (reactFlowBounds?.top ?? 0),
      });

      const intersectingNodes = getIntersectingNodes({
        ...position,
        width: 20,
        height: 20,
      }).reverse();
      console.log("intersectingNodes", intersectingNodes);

      const nearestGroup = intersectingNodes.find((n) => {
        if (n.type === NodeType.ResourceGroup) {
          return true;
        }
        const iconMapping = getIconMapping(
          n.data.resourceId.provider,
          n.data.resourceId.type,
        );
        return (
          (iconMapping?.groupIcon ?? iconMapping?.groupStyle) !== undefined
        );
      });
      console.log("nearestGroup", nearestGroup);

      const id = NodeId.parse(`${type}:${nodes.length}`);
      id.name = `${id.type}_${id.name}`;
      const newNode: Node = {
        id: id.toString(),
        type: NodeType.Resource,
        draggable: false,
        parentNode: nearestGroup?.id,
        extent: nearestGroup ? "parent" : undefined,
        data: {
          label: id.name,
          resourceId: id,
        },
        position,
      };

      try {
        await addGraphElements({
          nodes: [newNode],
        });
      } catch (e: any) {
        addError(e);
      }
    },
    [
      reactFlowInstance,
      getIntersectingNodes,
      nodes,
      addGraphElements,
      addError,
    ],
  );

  const onNodeClick = () => {
    menu && setMenu(null);
  };

  const onEdgeClick = (event: ReactMouseEvent, edge: Edge) => {
    selectEdge(edge.id);
    menu && setMenu(null);
  };

  const [menu, setMenu] = useState<any>(null);

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      // Prevent native context menu from showing
      event.preventDefault();

      // Calculate position of the context menu. We want to make sure it
      // doesn't get positioned off-screen.
      const pane = reactFlowWrapper.current?.getBoundingClientRect();
      if (!pane) {
        return;
      }

      const boundLeft = event.clientX < pane.left + pane.width - 250;
      const boundTop = event.clientY < pane.top + pane.height - 200;

      const position = {
        top: boundTop && event.clientY - pane.top,
        left: boundLeft && event.clientX - pane.left,
        right: !boundLeft && pane.right - event.clientX,
        bottom: !boundTop && pane.bottom - event.clientY,
      };

      setMenu({
        node,
        ...position,
        onAction: () => {
          setMenu(null);
        },
      });
    },
    [setMenu],
  );

  const onPaneContextMenu = useCallback(
    // close the context menu if it's open since we don't have pane-specific actions
    (event: ReactMouseEvent) => {
      event.preventDefault();
      setMenu(null);
    },
    [setMenu],
  );

  const onEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: Edge) => {
      // Prevent native context menu from showing
      event.preventDefault();

      // Calculate position of the context menu. We want to make sure it
      // doesn't get positioned off-screen.
      const pane = reactFlowWrapper.current?.getBoundingClientRect();
      if (!pane) {
        return;
      }
      const boundLeft = event.clientX < pane.left + pane.width - 250;
      const boundTop = event.clientY < pane.top + pane.height - 200;

      const position = {
        top: boundTop && event.clientY - pane.top,
        left: boundLeft && event.clientX - pane.left,
        right: !boundLeft && pane.right - event.clientX,
        bottom: !boundTop && pane.bottom - event.clientY,
      };

      setMenu({
        edge,
        ...position,
        onAction: () => {
          setMenu(null);
        },
      });
    },
    [setMenu],
  );

  const onPaneClick = useCallback(() => {
    // Close the context menu if it's open whenever the window is clicked.
    setMenu(null);

    // Clear the selected node/edge whenever the window is clicked.
    deselectNode(selectedNode ?? "");
    deselectEdge(selectedEdge ?? "");
    console.log("clicked pane");
  }, [setMenu, selectedNode, selectedEdge, deselectNode, deselectEdge]);

  useEffect(() => {
    if (edges.length !== oldEdgeCount || nodes.length !== oldNodeCount) {
      setOldEdgeCount(edges.length);
      setOldNodeCount(nodes.length);
      fitView({ padding: 0.1, maxZoom: 0.5, duration: 250 });
    }
  }, [fitView, nodes, edges, oldEdgeCount, oldNodeCount]);

  return (
    <ErrorBoundary
      onError={(error, info) =>
        trackError(
          new UIError({
            message: "uncaught error in EditorPane",
            errorId: "EditorPane:ErrorBoundary",
            cause: error,
            data: { info },
          }),
        )
      }
      fallbackRender={FallbackRenderer}
    >
      <div
        className={"grow-1 mx-2 size-full bg-gray-50 dark:bg-gray-900"}
        ref={reactFlowWrapper}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitViewOptions={{
            padding: 0.1,
            maxZoom: 0.5,
            duration: 250,
          }}
          isValidConnection={isValidConnection}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={NodeTypes}
          edgeTypes={EdgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineComponent={ConnectionLine}
          connectionLineType={ConnectionLineType.Straight}
          connectionLineStyle={{
            strokeWidth: 2,
            strokeLinecap: "square",
            zIndex: 1000,
          }}
          elevateNodesOnSelect={false}
          fitView
          proOptions={{
            hideAttribution: true,
          }}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          deleteKeyCode={null}
          className={classNames({
            "[&_div]:cursor-crosshair": isConnecting, // overrides the default grab cursor when you're connecting nodes
          })}
        >
          <Background variant={BackgroundVariant.Dots} gap={25} size={1} />
          {menu && <ContextMenu {...menu} viewSettings={viewSettings} />}
          <Controls showInteractive={false} />
          {canModifyConfiguration(viewSettings) ? <VersionNavigator /> : null}
        </ReactFlow>
        {showSpinner && (
          <WorkingOverlay show={true} message={"Autocompleting..."} />
        )}
      </div>
    </ErrorBoundary>
  );
}
