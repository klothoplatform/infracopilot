import "./WebUI.css";

import React, { useCallback, useEffect, useLayoutEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import {
  Box,
  Divider,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import ChatBar from "../components/ChatBar";
import Navigation from "../components/Navigation";
import "reactflow/dist/style.css";

import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { TabContext, TabPanel } from "@mui/lab";
import { sampleGraphYaml } from "../shared/resource-graph/Samples";
import {
  parse,
  ResourceGraphContext,
} from "../shared/resource-graph/ResourceGraph";
import { getEdgesFromGraph, getNodesFromGraph } from "../shared/reactflow/util";
import {
  autoLayout,
  DefaultLayoutOptions,
  NodeLayeringStrategy,
  NodePlacementStrategy,
} from "../shared/reactflow/AutoLayout";
import NodesTypes from "../shared/reactflow/NodesTypes";
import EdgeTypes from "../shared/reactflow/EdgeTypes";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 150 },
  {
    field: "type",
    headerName: "Type",
    width: 150,
    editable: true,
    resizable: true,
  },
];

const input = () => {
  const vizState = (document as any).vizState;
  if (vizState) {
    return vizState.input;
  } else {
    return sampleGraphYaml;
  }
};

function WebUI() {
  const [activeTab, setActiveTab] = React.useState("1");
  const [graphYaml, setGraphYaml] = React.useState(input());
  const { fitView } = useReactFlow();
  const [graph, setGraph] = React.useState(
    parse(input()).values().next().value
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [layoutOptions, setLayoutOptions] =
    React.useState(DefaultLayoutOptions);

  const updateLayout = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      autoLayout(nodes, edges, layoutOptions).then((update) => {
        setNodes(update.nodes);
        setEdges(update.edges);
      });
    },
    [setNodes, setEdges, layoutOptions]
  );

  useLayoutEffect(() => {
    const initialNodes = getNodesFromGraph(graph);
    const initialEdges = getEdgesFromGraph(graph);
    updateLayout(initialNodes, initialEdges);
  }, [updateLayout, graph]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // switches the active sidebar tab
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // every time our nodes change, we want to center the graph again
  useEffect(() => {
    fitView({ duration: 400 });
  }, [nodes, fitView]);

  return (
    <ResourceGraphContext.Provider value={{ graph, setGraph }}>
      <div style={{ width: "100vw", height: "100vh" }}>
        <Stack spacing={2}>
          <ChatBar />
          <Stack
            direction="row"
            divider={<Divider orientation="vertical" flexItem />}
            spacing={2}
          >
            <div style={{ height: 800, width: "100%" }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={NodesTypes}
                edgeTypes={EdgeTypes}
                // snapToGrid={true}
                fitView
                proOptions={{
                  hideAttribution: true,
                }}
                onNodeClick={(event, node) => {}}
              >
                <Controls />
                <MiniMap />
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={12}
                  size={1}
                />
              </ReactFlow>
            </div>
            <Stack style={{ minWidth: "500px", maxHeight: "80vh" }}>
              <TabContext value={activeTab}>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <InputLabel id="node-placements-strategy-select-label">
                    Node Placement Strategy
                  </InputLabel>
                  <Select
                    labelId="node-placements-strategy-select-label"
                    id="node-placements-strategy-select"
                    label="Node Placement Strategy"
                    defaultValue="NETWORK_SIMPLEX"
                    placeholder="Node Placement Strategy"
                    onChange={(e) => {
                      setLayoutOptions({
                        ...layoutOptions,
                        elkPlacementStrategy:
                          //@ts-ignore
                          NodePlacementStrategy[e.target.value],
                      });
                      nodes.forEach((n) => (n.position = { x: 0, y: 0 }));
                      updateLayout(nodes, edges);
                    }}
                  >
                    {Object.keys(NodePlacementStrategy).map((k, i) => (
                      <MenuItem value={k} key={`nps${i}`} id={`nps${i}`}>
                        {
                          // @ts-ignore
                          NodePlacementStrategy[k]
                        }
                      </MenuItem>
                    ))}
                  </Select>
                  <InputLabel id="node-layering-strategy-select-label">
                    Node Layering Strategy
                  </InputLabel>
                  <Select
                    labelId="node-layering-strategy-select-label"
                    id="node-layering-strategy-select"
                    label="Node Layering Strategy"
                    defaultValue="COFFMAN_GRAHAM"
                    placeholder="Node Layering Strategy"
                    onChange={(e) => {
                      setLayoutOptions({
                        ...layoutOptions,
                        elkNodeLayeringStrategy:
                          //@ts-ignore
                          NodeLayeringStrategy[e.target.value],
                      });
                      nodes.forEach((n) => (n.position = { x: 0, y: 0 }));
                      updateLayout(nodes, edges);
                    }}
                  >
                    {Object.keys(NodeLayeringStrategy).map((k, i) => (
                      <MenuItem value={k} key={`nls${i}`} id={`nls${i}`}>
                        {
                          // @ts-ignore
                          NodeLayeringStrategy[k]
                        }
                      </MenuItem>
                    ))}
                  </Select>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    aria-label="tool tabs"
                  >
                    <Tab value="1" label="Graph YAML" />
                    <Tab value="2" label="Nodes" />
                  </Tabs>
                </Box>
                <TabPanel value="1">
                  <TextField
                    placeholder="Provide your GraphYAML resource graph here"
                    fullWidth={true}
                    variant="outlined"
                    multiline={true}
                    defaultValue={graphYaml}
                    onChange={(e) => {
                      setGraphYaml(e.target.value);
                      try {
                        const graph = parse(e.target.value)
                          .values()
                          ?.next()?.value;
                        if (!graph.Nodes.length) {
                          return;
                        }
                        const nodes = getNodesFromGraph(graph);
                        const edges = getEdgesFromGraph(graph);
                        setGraph(graph);
                        updateLayout(nodes, edges);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    style={{
                      width: "50vw",
                      height: "40vw",
                      overflow: "scroll",
                    }}
                  />
                </TabPanel>
                <TabPanel value="2">
                  <DataGrid
                    rows={graph.Nodes}
                    columns={columns}
                    initialState={{
                      pagination: {
                        paginationModel: {
                          pageSize: 13,
                        },
                      },
                    }}
                    pageSizeOptions={[5]}
                    checkboxSelection
                    disableRowSelectionOnClick
                  />
                </TabPanel>
              </TabContext>
            </Stack>
          </Stack>
          <Navigation />
        </Stack>
      </div>
    </ResourceGraphContext.Provider>
  );
}

const ReactFlowWrapper = () => {
  return (
    <ReactFlowProvider>
      <WebUI />
    </ReactFlowProvider>
  );
};
export default ReactFlowWrapper;
