import {
  SmartSmoothStepEdge,
  SmartStepEdge,
} from "./smart-edges/SmartStepEdge";

const EdgeTypes = {
  smartstep: SmartStepEdge,
  smartsmoothstep: SmartSmoothStepEdge,
};

export const defaultEdgeOptions = {
  type: "floating",
  style: { zIndex: 30 },
  hidden: true,
};

export default EdgeTypes;
