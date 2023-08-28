import {
  SmartSmoothStepEdge,
  SmartStepEdge,
} from "./smart-edges/SmartStepEdge";
import { FloatingEdge } from "./FloatingEdge";

const EdgeTypes = {
  floating: FloatingEdge,
  smartstep: SmartStepEdge,
  smartsmoothstep: SmartSmoothStepEdge,
};

export const defaultEdgeOptions = {
  type: "floating",
  style: { zIndex: 10000 },
  hidden: true,
};

export default EdgeTypes;
