import {
  SmartSmoothStepEdge,
  SmartStepEdge,
} from "./smart-edges/SmartStepEdge";

const EdgeTypes = {
  smartstep: SmartStepEdge,
  smartsmoothstep: SmartSmoothStepEdge,
};

export const defaultEdgeOptions = {
  type: "smartstep",
  hidden: true,
};

export default EdgeTypes;
