import "./ArchitectureEditor.scss";

import React, { useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import { Typography } from "@mui/material";
import "reactflow/dist/style.css";

import { useSearchParams } from "react-router-dom";
import EditorPane from "./EditorPane";
import Grid2 from "@mui/material/Unstable_Grid2";
import LeftSidebar from "./LeftSidebar";
import useEditorStore from "../store/store";

function ArchitectureEditor() {
  const [searchParams] = useSearchParams();
  const { loadArchitecture } = useEditorStore();

  useEffect(() => {
    loadArchitecture?.(searchParams.get("architectureId") ?? "default");
  }, [loadArchitecture, searchParams]);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <div
        style={{
          height: "36px",
          padding: "8px",
          backgroundColor: "#3f51b5",
          color: "white",
        }}
      >
        <Typography variant={"h5"}>InfraCopilot</Typography>
      </div>
      <Grid2 container height={"100%"} width={"100%"} rowSpacing={0}>
        <Grid2 xs={2}>
          <LeftSidebar />
        </Grid2>
        <Grid2 xs={10}>
          <EditorPane />
        </Grid2>
      </Grid2>
    </div>
  );
}

const ReactFlowWrapper = () => {
  return (
    <ReactFlowProvider>
      <ArchitectureEditor />
    </ReactFlowProvider>
  );
};
export default ReactFlowWrapper;
