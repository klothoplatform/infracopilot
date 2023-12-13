import React, { useCallback, useEffect, useRef } from "react";
import type { Edge, Node } from "reactflow";

import useApplicationStore from "../store/ApplicationStore";
import { BiImage, BiX } from "react-icons/bi";
import { exportImage } from "../../shared/export/ExportImage";
import { downloadFile } from "../../helpers/download-file";

interface ContextMenuProps {
  node?: Node;
  edge?: Edge;
  top: number;
  left: number;
  right: number;
  bottom: number;
  onAction?: () => void;
}

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
  const { deleteElements, nodes, edges } = useApplicationStore();

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onAction?.();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onAction]);

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

  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{ top, left, right, bottom }}
      className=" absolute z-[10] max-w-[250px] divide-y divide-gray-300 overflow-hidden rounded-md border-solid bg-white text-xs drop-shadow-lg dark:divide-gray-700 dark:bg-gray-800"
      {...props}
      onBlur={onAction}
      ref={ref}
    >
      <div
        className="w-full truncate bg-primary-600 px-2 py-3 text-white dark:bg-primary-700"
        title={node?.id ?? edge?.id}
      >
        <small>{node?.id ?? edge?.id}</small>
      </div>
      {(node || edge) && (
        <ContextMenuButton
          icon={<BiX />}
          onClick={node ? deleteNode : deleteEdge}
        >
          Delete {node ? "Resource" : "Connection"}
        </ContextMenuButton>
      )}
      {/*<ContextMenuButton*/}
      {/*  icon={<BiImage />}*/}
      {/*  onClick={async () =>*/}
      {/*    downloadFile("Diagram.png", await exportImage(nodes, edges, "png"))*/}
      {/*  }*/}
      {/*>*/}
      {/*  Export Diagram (.png)*/}
      {/*</ContextMenuButton>*/}
    </div>
  );
}

type ContextMenuButtonProps = {
  onClick?: () => void;
  icon?: React.JSX.Element;
  children?: React.ReactNode;
};

const ContextMenuButton = ({
  onClick,
  icon,
  children,
}: ContextMenuButtonProps) => (
  <button
    className="flex w-full items-center bg-gray-50 p-2 text-left hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
    onClick={onClick}
  >
    <span className="mr-1 inline-block min-w-[16px] max-w-[16px]">
      {icon ?? ""}
    </span>
    {children}
  </button>
);
