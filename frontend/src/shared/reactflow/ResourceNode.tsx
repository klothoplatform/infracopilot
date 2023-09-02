import type { FC } from "react";
import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Handle, Position, useStore, useUpdateNodeInternals } from "reactflow";
import { getIcon } from "./ResourceMappings";
import useApplicationStore from "../../views/store/store";

import "./NodeStyles.scss";
import reducer from "../../helpers/reducer";
import { NodeId } from "../architecture/TopologyNode";
import { BiEdit } from "react-icons/bi";
import classNames from "classnames";

interface ResourceNodeProps {
  id: string;
  data: any;
  isConnectable: boolean;
}

const connectionNodeIdSelector = (state: any) => state.connectionNodeId;

const ResourceNode = memo(({ id, data, isConnectable }: ResourceNodeProps) => {
  const { architecture, selectedNode, replaceResource } = useApplicationStore();

  const connectionNodeId = useStore(connectionNodeIdSelector);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const isConnecting = !!connectionNodeId;
  const isTarget = connectionNodeId && connectionNodeId !== id;
  const isSelected = selectedNode === id;
  const [mouseOverNode, setMouseOverNode] = useState(false);
  // this could be a map by handle id
  const [mouseOverHandle, setMouseOverHandle] = useState(false);
  const showSourceHandle = !isConnecting && (mouseOverNode || mouseOverHandle);
  const updateNodeInternals = useUpdateNodeInternals();
  const handles = useMemo(() => {
    updateNodeInternals(id);

    return data.handles?.map((h: any) => {
      return (
        <Handle
          key={h.id}
          type={h.type}
          position={h.position}
          id={h.id}
          style={{
            // TODO: align handles according to edge data
            background: "#545B64",
            visibility: "hidden",
          }}
          onConnect={(params) => console.log("handle onConnect", params)}
          isConnectable={isConnectable}
        />
      );
    });
  }, [updateNodeInternals, id, data, isConnectable]);

  return (
    // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events,tailwindcss/no-custom-classname
    <div
      className="resource-node"
      onMouseOver={(e) => {
        setMouseOverNode(true);
      }}
      onMouseLeave={(e) => {
        setMouseOverNode(false);
      }}
    >
      {handles}
      {isConnecting && (
        <Handle
          // eslint-disable-next-line tailwindcss/no-custom-classname
          className="full-icon-handle"
          id={`${id}-dnd-target`}
          position={Position.Left}
          type="target"
        />
      )}
      <div className="flex max-h-[200px] w-[100px] flex-col items-center">
        {getIcon(
          data.resourceId.provider,
          data.resourceId.type,
          {
            height: "100%",
            width: "100%",
          },
          data,
        )}
        {/* eslint-disable-next-line jsx-a11y/mouse-events-have-key-events */}
        <div
          className="relative ml-14 mt-[-100px] flex h-full px-8 pb-8 pt-16"
          onMouseOver={(e) => {
            setMouseOverHandle(true);
          }}
          onMouseLeave={(e) => {
            setMouseOverHandle(false);
          }}
        >
          <Handle
            className={classNames(
              "handle-source -right-2 bottom-0 pr-3",
              showSourceHandle ? "opacity-85" : "opacity-0",
            )}
            id={`${id}-dnd-source`}
            position={Position.Right}
            type="source"
          />
        </div>
        <div className="flex flex-col text-center dark:text-white">
          <button
            onClick={() => setIsEditingLabel(true)}
            style={{
              position: "relative",
              width: "200%",
              left: "-50px",
              overflowWrap: "anywhere",
              paddingBottom: "2px",
            }}
          >
            <EditableLabel
              label={data.label}
              editing={isEditingLabel}
              onSubmit={async (newValue) => {
                const { provider, type, namespace } = data.resourceId;
                await replaceResource(
                  data.resourceId,
                  new NodeId(type, namespace, newValue, provider),
                );
                setIsEditingLabel(false);
              }}
            ></EditableLabel>
          </button>
          <div
            style={{
              position: "relative",
              width: "200%",
              left: "-50px",
              overflowWrap: "anywhere",
              fontSize: "smaller",
            }}
          >
            <i>
              {data.resourceId.provider === architecture.provider
                ? data.resourceId.type
                : `${data.resourceId.provider}:${data.resourceId.type}`}
            </i>
          </div>
        </div>
      </div>
    </div>
  );
});
ResourceNode.displayName = "ResourceNode";

type EditableLabelProps = {
  label: string;
  onSubmit?: (newValue: string) => void;
  editing?: boolean;
};

const EditableLabel: FC<EditableLabelProps> = ({
  editing,
  label,
  onSubmit,
}) => {
  const [state, dispatch] = useReducer(reducer, { label });
  const { selectedNode } = useApplicationStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEditIcon, setShowEditIcon] = useState(false);

  useEffect(() => {
    if (editing) {
      onSubmit?.(state.label);
    }
  }, [selectedNode]);

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing, inputRef]);

  return (
    <div className="font-semibold">
      {!editing && (
        <div
          className="flex justify-center hover:border-[1px] hover:border-gray-500 hover:bg-gray-100/50"
          onMouseEnter={(e) => {
            setShowEditIcon(true);
          }}
          onMouseLeave={(e) => {
            setShowEditIcon(false);
          }}
        >
          <div
            className={classNames(
              "text-center",
              showEditIcon ? "ml-auto" : undefined,
            )}
          >
            {label}
          </div>
          {!editing && showEditIcon && (
            <>
              <div className="ml-1"></div>
              <div className="mr-auto">
                <BiEdit />
              </div>
            </>
          )}
        </div>
      )}
      {editing && (
        <form>
          <input
            ref={inputRef}
            className="border-[1px] border-gray-50 bg-gray-300/[.25] px-1 py-0.5 text-center"
            id="label"
            required
            value={state.label}
            type="text"
            onChange={(e) =>
              dispatch({ field: e.target.id, value: e.target.value })
            }
          />
          <input
            hidden
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              onSubmit?.(state.label);
            }}
          />
        </form>
      )}
    </div>
  );
};

export default ResourceNode;
