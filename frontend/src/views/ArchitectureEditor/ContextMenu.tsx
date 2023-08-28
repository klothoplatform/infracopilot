import React, { useCallback } from "react";
import { Edge, Node, useReactFlow } from "reactflow";

import "./ContextMenu.scss";
import useApplicationStore from "../store/store";

type ContextMenuProps = {
  node?: Node;
  edge?: Edge;
  top: number;
  left: number;
  right: number;
  bottom: number;
  onAction?: () => void;
};

export const ContextMenuOptions = [];

export default function ContextMenu({
  node,
  edge,
  top,
  left,
  right,
  bottom,
  onAction,
  ...props
}: ContextMenuProps) {
  const { setNodes, setEdges } = useReactFlow();

  const { deleteElements } = useApplicationStore();

  const deleteNode = useCallback(() => {
    if (!node) {
      return;
    }
    deleteElements({ nodes: [node] });
    onAction?.();
  }, [deleteElements, node, onAction]);

  const deleteEdge = useCallback(() => {
    if (!edge) {
      return;
    }
    deleteElements({ edges: [edge as Edge] });
    onAction?.();
  }, [deleteElements, edge, onAction]);

  return (
    <div
      style={{ top, left, right, bottom }}
      className="context-menu"
      {...props}
    >
      <p style={{ margin: "0.5em" }}>
        <small>{node ? `node: ${node.id}` : `edge: ${edge?.id}`}</small>
      </p>
      <button onClick={node ? deleteNode : deleteEdge}>delete</button>
    </div>
  );
}
