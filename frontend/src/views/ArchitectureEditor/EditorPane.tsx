import type { Edge, Node } from "reactflow";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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
import StraightConnectionLine from "../../shared/reactflow/StraightConnectionLine";
import ContextMenu from "./ContextMenu";
import { Backdrop, CircularProgress } from "@mui/material";

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
      console.log("added node");
      console.log("applying constraints", unappliedConstraints);
      // await applyConstraints();
      selectNode(newNode.id);
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
    selectNode(node.id);
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
    fitView({ padding: 0.1, nodes: nodes, maxZoom: 1 });
  }, [fitView, nodes, edges]);

  return (
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
        connectionLineComponent={StraightConnectionLine}
        connectionLineStyle={{
          stroke: "blue",
          strokeWidth: 2,
          strokeLinecap: "round",
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
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={25} size={1} />
        {menu && <ContextMenu {...menu} />}
        <Controls />
      </ReactFlow>
      <Backdrop
        sx={{
          color: "purple",
          zIndex: (theme) => theme.zIndex.drawer + 10000,
        }}
        open={!canApplyConstraints}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </div>
  );
}
