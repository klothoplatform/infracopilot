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

let id = 0;

export default function EditorPane() {
  const reactFlowWrapper = useRef<any>(null);
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

  const [oldNodeCount, setOldNodeCount] = useState<number>(nodes.length);
  const [oldEdgeCount, setOldEdgeCount] = useState<number>(edges.length);

  const getId = () => `${id++}`;

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
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const id = NodeId.fromString(`${type}/${getId()}`);
      id.name = `${id.type}_${id.name}`;
      const newNode: Node = {
        id: id.toTopologyString(),
        type: NodeType.Resource,
        draggable: false,
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
    [
      unappliedConstraints,
      selectNode,
      applyConstraints,
      addGraphElements,
      reactFlowInstance,
    ],
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
      // TODO: consider an alternate positioning strategy (maybe based on node position?)
      const pane = reactFlowWrapper.current.getBoundingClientRect();
      setMenu({
        node,
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX - pane.left,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
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
      // TODO: consider an alternate positioning strategy (maybe based on node position?)
      const pane = reactFlowWrapper.current.getBoundingClientRect();
      setMenu({
        edge,
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX - pane.left,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
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

  const { fitView } = useReactFlow();

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
        <WorkingOverlay show={!canApplyConstraints} />
      </div>
    </>
  );
}
