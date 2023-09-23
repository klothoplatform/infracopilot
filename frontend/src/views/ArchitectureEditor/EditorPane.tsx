import type { Edge, Node } from "reactflow";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  useReactFlow,
} from "reactflow";
import NodesTypes, { NodeType } from "../../shared/reactflow/NodesTypes";
import EdgeTypes, {
  defaultEdgeOptions,
} from "../../shared/reactflow/EdgeTypes";
import type { MouseEvent as ReactMouseEvent } from "react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { NodeId } from "../../shared/architecture/TopologyNode";
import useApplicationStore from "../store/store";
import ContextMenu from "./ContextMenu";
import { WorkingOverlay } from "../../components/WorkingOverlay";
import { getIconMapping } from "../../shared/reactflow/ResourceMappings";

export default function EditorPane() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addGraphElements,
    applyConstraints,
    canApplyConstraints,
    selectNode,
    selectEdge,
    selectedNode,
    selectedEdge,
    unappliedConstraints,
    deselectNode,
    deselectEdge,
  } = useApplicationStore();

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

      const id = NodeId.fromString(`${type}/${nodes.length}`);
      id.name = `${id.type}_${id.name}`;
      const newNode: Node = {
        id: id.toTopologyString(),
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

      await addGraphElements({
        nodes: [newNode],
      });
    },
    [reactFlowInstance, getIntersectingNodes, nodes.length, addGraphElements],
  );

  const onNodeClick = (event: ReactMouseEvent, node: Node) => {
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
      fitView({ padding: 0.1, nodes: nodes, maxZoom: 1 });
    }
  }, [fitView, nodes, edges, oldEdgeCount, oldNodeCount]);

  return (
    <>
      <div
        className={"mx-2 block h-full w-full bg-gray-50 dark:bg-gray-900"}
        ref={reactFlowWrapper}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={NodesTypes}
          edgeTypes={EdgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.Straight}
          connectionLineStyle={{
            stroke: "#545B64",
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
        >
          <Background variant={BackgroundVariant.Dots} gap={25} size={1} />
          {menu && <ContextMenu {...menu} />}
          <Controls />
        </ReactFlow>
        <WorkingOverlay show={showSpinner} message={"Autocompleting..."} />
      </div>
    </>
  );
}
