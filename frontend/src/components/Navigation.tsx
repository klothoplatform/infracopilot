import "./watermark.scss";

import { memo, useState } from "react";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import FiberNewIcon from "@mui/icons-material/FiberNew";
import { useReactFlow } from "reactflow";
import { getVizState, Watermark } from "../shared/VizState";
import { exportImage } from "../shared/export/ExportImage";

function downloadImage(dataUrl: string, format: string) {
  const a = document.createElement("a");
  const vizState = getVizState();
  if (vizState) {
    vizState.output = { diagramUrl: dataUrl };
  } else {
    a.setAttribute("download", `reactflow.${format.toLowerCase()}`);
    a.setAttribute("href", dataUrl);
    a.click();
  }
}

export default memo(() => {
  const { getNodes, getEdges } = useReactFlow();
  const [value, setValue] = useState("recents");
  const onClick = async (format: string) => {
    const nodes = getNodes();
    const edges = getEdges();
    const vizState = getVizState();
    const watermark = !vizState
      ? Watermark.InfraCopilot
      : vizState.input?.watermark;
    const image = await exportImage(nodes, edges, format, watermark);
    await downloadImage(image, format);
  };

  return (
    <>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
        }}
      >
        <BottomNavigationAction
          label="New Architecture"
          icon={<FiberNewIcon />}
        />
        <BottomNavigationAction label="Go Back" icon={<ArrowBackIcon />} />
        <BottomNavigationAction label="Add Node" icon={<AddCircleIcon />} />
        <BottomNavigationAction
          label="Export IaC"
          icon={<CloudDownloadIcon />}
        />
        <BottomNavigationAction
          id="export-png-button"
          label="Export PNG"
          icon={<CloudDownloadIcon />}
          onClick={() => onClick("png")}
        />
        <BottomNavigationAction
          id="export-svg-button"
          label="Export SVG"
          icon={<CloudDownloadIcon />}
          onClick={() => onClick("svg")}
        />
      </BottomNavigation>
    </>
  );
});
