import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
} from "reactflow";
import NodesTypes, { NodeType } from "../../shared/reactflow/NodesTypes";
import EdgeTypes, {
  defaultEdgeOptions,
} from "../../shared/reactflow/EdgeTypes";
import React, {
  MouseEvent as ReactMouseEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { NodeId } from "../../shared/architecture/TopologyNode";
import {
  ArchitectureView,
  toReactFlowElements,
} from "../../shared/architecture/Architecture";
import useEditorStore from "../store/store";
import StraightConnectionLine from "../../shared/reactflow/StraightConnectionLine";

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
    architecture,
    refreshLayout,
    applyConstraints,
    selectNode,
  } = useEditorStore();

  useLayoutEffect(() => {
    (async () => {
      if (!architecture?.views) {
        return;
      }
      console.log("loading architecture", architecture);
      await addGraphElements(
        toReactFlowElements(architecture, ArchitectureView.DataFlow),
        false
      );
    })();
  }, [addGraphElements, refreshLayout, architecture]);

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
        id: id.toString(),
        type: NodeType.Resource,
        data: {
          label: `${id.type}_${id.name}`,
          resourceId: id,
        },
        position,
      };

      await addGraphElements({
        nodes: [newNode],
      });
      await applyConstraints();
      selectNode(newNode.id);
    },
    [selectNode, applyConstraints, addGraphElements, reactFlowInstance]
  );

  const onNodeClick = (event: ReactMouseEvent, node: Node) => {
    selectNode(node.id);
  };

  return (
    <div style={{ height: "90%", width: "100%" }} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
        }}
        elevateNodesOnSelect={false}
        fitView
        proOptions={{
          hideAttribution: true,
        }}
        onNodeClick={onNodeClick}
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={25} size={1} />
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
