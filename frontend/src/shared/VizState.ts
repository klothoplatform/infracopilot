// Watermark defines valid watermark types
export enum Watermark {
  InfraCopilot = "infracopilot",
}
export interface VizInput {
  // graph is a topology YAML representation of the graph
  graph: string;
  // watermark is the watermark to add to the graph
  watermark?: Watermark;
}

export interface VizOutput {
  // diagramUrl is data url of the diagram
  diagramUrl: string;
}

export interface VizState {
  input?: VizInput;
  output?: VizOutput;
}

// getVizState is a utility to get the viz state from the current document
export function getVizState(): VizState | undefined {
  return (document as any).vizState as VizState;
}
