import type { Edge, Node } from "reactflow";
import type { NodeId } from "./architecture/TopologyNode";
import type { EnvironmentVersion } from "./architecture/EnvironmentVersion";

export function refreshSelection({
  environmentVersion,
  nodes,
  edges,
  selectedNode,
  selectedEdge,
  selectedResource,
}: RefreshSelectionArgs): RefreshSelectionResult {
  const result: RefreshSelectionResult = {};
  if (!nodes?.length && !edges?.length) {
    return result;
  }

  if (selectedNode) {
    const node = nodes?.find((n) => n.id === selectedNode);
    if (node) {
      node.selected = true;
      result.selectedNode = node.id;
    }
  }
  if (selectedEdge) {
    const edge = edges?.find((e) => e.id === selectedEdge);
    if (edge) {
      edge.selected = true;
      result.selectedEdge = edge.id;
    }
  }
  if (selectedResource) {
    const node = nodes?.find(
      (n) => n.data.resourceId?.equals(selectedResource),
    );
    if (node) {
      node.selected = true;
      result.selectedNode = node.id;
      result.selectedResource = selectedResource;
    } else if (
      environmentVersion?.resources?.has(selectedResource.toString())
    ) {
      result.selectedResource = selectedResource;
      result.selectedNode = undefined;
    }
  }

  return result;
}

type RefreshSelectionArgs = {
  environmentVersion: EnvironmentVersion;
  nodes?: Node[];
  edges?: Edge[];
  selectedNode?: string;
  selectedEdge?: string;
  selectedResource?: NodeId;
};

type RefreshSelectionResult = {
  selectedNode?: string;
  selectedEdge?: string;
  selectedResource?: NodeId;
};
