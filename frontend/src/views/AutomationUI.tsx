import React, { useCallback, useEffect, useLayoutEffect } from "react";
import ReactFlow, {
  Edge,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import Navigation from "../components/Navigation";
import "reactflow/dist/style.css";
import { sampleGraphYaml } from "../shared/resource-graph/Samples";
import {
  parse,
  ResourceGraphContext,
} from "../shared/resource-graph/ResourceGraph";
import { getEdgesFromGraph, getNodesFromGraph } from "../shared/reactflow/util";
import { autoLayout } from "../shared/reactflow/AutoLayout";
import NodesTypes from "../shared/reactflow/NodesTypes";
import { useSearchParams } from "react-router-dom";
import EdgeTypes from "../shared/reactflow/EdgeTypes";
import { getVizState } from "../shared/VizState";

const input = (browserInput?: string) => {
  const vizState = getVizState();
  return vizState?.input?.graph ?? browserInput ?? "";
};

function AutomationUI() {
  const { fitView } = useReactFlow();

  const [searchParams] = useSearchParams();
  const browserInput =
    searchParams.get("demo")?.toLowerCase() === "true"
      ? sampleGraphYaml
      : undefined;

  const [graph, setGraph] = React.useState(
    parse(input(browserInput)).values().next().value
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const updateLayout = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      autoLayout(nodes, edges).then((update: any) => {
        setNodes(update.nodes);
        setEdges(update.edges);
      });
    },
    [setNodes, setEdges]
  );

  useLayoutEffect(() => {
    const initialNodes = getNodesFromGraph(graph);
    const initialEdges = getEdgesFromGraph(graph);
    updateLayout(initialNodes, initialEdges);
  }, [updateLayout, graph]);

  // every time our nodes change, we want to center the graph again
  useEffect(() => {
    fitView();
  }, [nodes, fitView]);

  return (
    <ResourceGraphContext.Provider value={{ graph, setGraph }}>
      <div style={{ width: "100vw", height: "100vh" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NodesTypes}
          edgeTypes={EdgeTypes}
          fitView
          proOptions={{
            hideAttribution: true,
          }}
          onNodeClick={(event, node) => {}}
        />
        <Navigation />
      </div>
    </ResourceGraphContext.Provider>
  );
}

const ReactFlowWrapper = () => {
  return (
    <ReactFlowProvider>
      <AutomationUI />
    </ReactFlowProvider>
  );
};
export default ReactFlowWrapper;
