import type { FC } from "react";
import React, {
  memo,
  useContext,
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
import {
  RightSidebarDetailsTabs,
  RightSidebarTabs,
} from "../../shared/sidebar-nav";
import { ThemeContext } from "flowbite-react/lib/esm/components/Flowbite/ThemeContext";
import { TbDotsCircleHorizontal } from "react-icons/tb";

interface ResourceNodeProps {
  id: string;
  data: any;
  isConnectable: boolean;
}

const connectionNodeIdSelector = (state: any) => state.connectionNodeId;

const ResourceNode = memo(({ id, data, isConnectable }: ResourceNodeProps) => {
  const {
    architecture,
    selectedResource,
    replaceResource,
    selectNode,
    selectResource,
    navigateRightSidebar,
  } = useApplicationStore();

  const connectionNodeId = useStore(connectionNodeIdSelector);
  const isConnecting = !!connectionNodeId;
  const isTarget = connectionNodeId && connectionNodeId !== id;
  const isSelected = selectedResource === data.resourceId;
  const { mode } = useContext(ThemeContext);
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

  const quickIcons = useMemo(() => {
    if (data.vizMetadata?.children === undefined) {
      return;
    }
    const quickIconComponents = data.vizMetadata?.children.map(
      (element: NodeId) => {
        let icon = getIcon(
          element.provider,
          element.type,
          {
            height: "25px",
            width: "25px",
            key: element.name,
          },
          data,
        );
        const clone = React.cloneElement(icon, {
          key: element.toKlothoIdString(),
        });
        return (
          <div key={element.name} title={element.toKlothoIdString()}>
            <button
              type="button"
              onClick={() => {
                selectResource(element);
                navigateRightSidebar([
                  RightSidebarTabs.Details,
                  RightSidebarDetailsTabs.Config,
                ]);
              }}
            >
              {clone}
            </button>
          </div>
        );
      },
    );

    if (quickIconComponents === undefined) {
      return;
    }
    return [
      ...quickIconComponents.slice(0, 2),
      <DotsHorizontal
        key={`${data.resourceId.toKlothoIdString()}-dots`}
        resourceId={data.resourceId}
      />,
    ];
  }, [data, navigateRightSidebar, selectResource]);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/mouse-events-have-key-events,tailwindcss/no-custom-classname */}
      <div
        className={classNames("resource-node", {
          "border-2 rounded-md border-purple-700 shadow-md bg-white dark:bg-gray-900 dark:border-purple-200 w-fit p-2 transform-[translateY(-8px)]":
            false, //isSelected, -- TODO: enable this once styling is fixed to ensure that this div properly wraps the node's contents
        })}
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
        <div className="flex max-h-[200px] w-[100px] flex-col justify-center gap-1">
          {getIcon(
            data.resourceId.provider,
            data.resourceId.type,
            {
              height: "100%",
              width: "100%",
              onClick: () => {
                selectNode(id);
                selectResource(data.resourceId);
                navigateRightSidebar([
                  RightSidebarTabs.Details,
                  RightSidebarDetailsTabs.Config,
                ]);
              },
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
          <div className="flex flex-col text-center dark:text-gray-200">
            <EditableLabel
              label={data.label}
              onSubmit={async (newValue) => {
                const { provider, type, namespace } = data.resourceId;
                await replaceResource(
                  data.resourceId,
                  new NodeId(type, namespace, newValue, provider),
                );
              }}
            ></EditableLabel>
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
        <div className="flex flex-row justify-center gap-2 pt-1">
          {quickIcons}
        </div>
      </div>
    </>
  );
});
ResourceNode.displayName = "ResourceNode";

type EditableLabelProps = {
  label: string;
  onSubmit?: (newValue: string) => void;
};

const EditableLabel: FC<EditableLabelProps> = ({ label, onSubmit }) => {
  const isEditingRef = useRef(false);
  const [state, dispatch] = useReducer(reducer, { label });
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEditIcon, setShowEditIcon] = useState(false);

  useEffect(() => {
    if (isEditingRef.current && document.activeElement !== inputRef.current) {
      if (state.label !== label) {
        onSubmit?.(state.label);
      }
      isEditingRef.current = false;
    }
  }, [onSubmit, state.label]);

  useLayoutEffect(() => {
    if (isEditingRef.current) {
      inputRef.current?.focus();
    }
  }, [inputRef.current, isEditingRef.current]);

  return (
    <button
      onClick={() => (isEditingRef.current = true)}
      style={{
        position: "relative",
        width: "200%",
        left: "-50px",
        overflowWrap: "anywhere",
        paddingBottom: "2px",
      }}
    >
      <div className="font-semibold">
        {!isEditingRef.current && (
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
            {!isEditingRef.current && showEditIcon && (
              <>
                <div className="ml-1"></div>
                <div className="mr-auto">
                  <BiEdit />
                </div>
              </>
            )}
          </div>
        )}
        {isEditingRef.current && (
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
                if (state.label !== label) {
                  onSubmit?.(state.label);
                }
                isEditingRef.current = false;
              }}
            />
          </form>
        )}
      </div>
    </button>
  );
};

type DotsHorizontalProps = {
  resourceId: NodeId;
};
const DotsHorizontal: FC<DotsHorizontalProps> = ({ resourceId }) => {
  const { selectResource, navigateRightSidebar } = useApplicationStore();
  return (
    <button
      title="additional resources"
      className="h-[25px] w-[25px]"
      type="button"
      onClick={() => {
        selectResource(resourceId);
        navigateRightSidebar([
          RightSidebarTabs.Details,
          RightSidebarDetailsTabs.AdditionalResources,
        ]);
      }}
    >
      <TbDotsCircleHorizontal
        className="text-gray-800 dark:text-gray-200"
        size="25px"
      />
    </button>
  );
};

export default ResourceNode;
