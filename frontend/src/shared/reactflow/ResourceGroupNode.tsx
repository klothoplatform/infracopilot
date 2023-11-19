import type { FC } from "react";
import React, {
  memo,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { getIconMapping, GroupIcon } from "../resources/ResourceMappings";
import { Handle, Position, useStore, useUpdateNodeInternals } from "reactflow";
import reducer from "../../helpers/reducer";
import useApplicationStore from "../../views/store/ApplicationStore";
import classNames from "classnames";
import { NodeId } from "../architecture/TopologyNode";
import { RightSidebarDetailsTabs, RightSidebarTabs } from "../sidebar-nav";

interface GroupNodeProps {
  id: string;
  data: any;
  style?: object;
  isConnectable: boolean;
}

const connectionNodeIdSelector = (state: any) => state.connectionNodeId;

const ResourceGroupNode = memo(
  ({ id, data, isConnectable }: GroupNodeProps) => {
    const {
      architecture,
      selectedResource,
      replaceResource,
      selectNode,
      selectResource,
      navigateRightSidebar,
      nodes,
      resourceTypeKB,
    } = useApplicationStore();

    const connectionNodeId = useStore(connectionNodeIdSelector);
    const isConnecting = !!connectionNodeId;
    const isSelected = selectedResource === data.resourceId;
    const hasChildren = !!nodes.find((node) => node.parentNode === id);

    const onSelect = () => {
      console.log("onSelect", data.resourceId);
      selectResource(data.resourceId);
      selectNode(id);
      navigateRightSidebar([
        RightSidebarTabs.Details,
        RightSidebarDetailsTabs.Config,
      ]);
    };

    const iconMapping = getIconMapping(
      data.resourceId.provider,
      data.resourceId.type,
      data,
    );
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

    const resourceType = resourceTypeKB.getResourceType(
      data.resourceId.provider,
      data.resourceId.type,
    );

    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
      <div
        onClick={onSelect}
        className={classNames(
          "group-node relative border-2 rounded-md bg-transparent pointer-events-auto flex",
          {
            "left-[-5px] top-[-5px] border-primary-600/100 dark:border-primary-500/100 h-[calc(100%+10px)] w-[calc(100%+10px)] shadow-md shadow-primary-100 dark:shadow-primary-900":
              isSelected,
            "border-primary-600/[0] w-full h-full": !isSelected,
          },
        )}
      >
        {iconMapping?.groupEnableDragTarget && isConnecting && (
          <Handle
            className="group-target-handle"
            id={`${id}-dnd-target`}
            position={Position.Left}
            type="target"
          />
        )}
        {handles}
        <div
          className={classNames(
            "flex flex-col border-gray-600 justify-start gap-1 bg-white dark:bg-gray-800",
            {
              "w-full h-full": !isSelected,
              "w-[calc(100%-10px)] h-[calc(100%-10px)] mx-auto my-auto":
                isSelected,
            },
          )}
          style={{
            boxShadow: `0px 0px 0px 2px ${
              iconMapping?.groupStyle?.borderColor ?? "gray"
            } inset`,
            ...iconMapping?.groupStyle,
          }}
        >
          <div className="flex h-fit w-full">
            <div className="min-h-[24px] min-w-[24px]">
              <GroupIcon
                provider={data.resourceId.provider}
                type={data.resourceId.type}
                data={data}
                style={{
                  width: "24px",
                  height: "24px",
                }}
              />
            </div>
            <EditableLabel
              label={
                data.resourceId.provider === architecture.provider
                  ? `${data.resourceId.type}:${data.resourceId.name}`
                  : data.resourceId.toString()
              }
              disabled
              onSubmit={async (newValue) => {
                const { provider, type, namespace } = data.resourceId;
                await replaceResource(
                  data.resourceId,
                  new NodeId(type, namespace, newValue, provider),
                );
                if (
                  selectedResource?.toString() === data.resourceId.toString()
                ) {
                  selectResource(
                    new NodeId(type, namespace, newValue, provider),
                  );
                }
              }}
              initialValue={data.resourceId.name}
            />
          </div>
          {!hasChildren && (
            <div
              className={
                "mx-auto my-2 flex h-full w-[calc(100%-1rem)] items-center justify-center text-ellipsis rounded border-2 border-dashed border-gray-500 text-center text-gray-500 dark:border-gray-300 dark:text-gray-300"
              }
            >
              <p className="p-2">
                {iconMapping?.emptyGroupMessage ??
                  `You can drag and drop resources ${
                    resourceType
                      ? "into this " + resourceType.displayName
                      : "here"
                  }`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

type EditableLabelProps = {
  label: string;
  disabled?: boolean;
  initialValue?: string;
  onSubmit?: (newValue: string) => void;
};

const EditableLabel: FC<EditableLabelProps> = ({
  initialValue,
  label,
  disabled,
  onSubmit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [shouldSelectContent, setShouldSelectContent] = useState(true);
  const [state, dispatch] = useReducer(reducer, {
    label: initialValue ?? label,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onBlur = (e: any) => {
    if (e.relatedTarget !== inputRef.current) {
      if (state.label !== (initialValue ?? label)) {
        onSubmit?.(state.label);
      }
      setIsEditing(false);
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditing(false);
        dispatch({ field: "label", value: initialValue ?? label });
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [initialValue, isEditing, label]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <button
      disabled={disabled}
      onClick={() => {
        setIsEditing(true);
        setShouldSelectContent(true);
      }}
      className="h-fit max-w-[calc(100%-36px)] justify-start break-all text-start dark:text-gray-200"
    >
      <>
        {!isEditing && (
          <div
            className={classNames(
              "line-clamp-2 rounded-sm border-[1px] border-gray-500/[0] px-1 font-semibold",
              {
                "cursor-text hover:border-gray-500 hover:bg-gray-100/20 dark:hover:bg-gray-700/20":
                  !disabled,
                "pointer-events-none": disabled,
              },
            )}
          >
            {label}
          </div>
        )}
        {isEditing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (state.label !== label) {
                onSubmit?.(state.label);
              }
              setIsEditing(false);
            }}
          >
            <input
              ref={(e) => {
                inputRef.current = e;
                if (e && shouldSelectContent) {
                  e.select();
                  setShouldSelectContent(false);
                }
              }}
              className={classNames(
                "text-center overflow-x-visible rounded-sm border-[1px] bg-gray-50 p-1 focus:border-gray-50 dark:bg-gray-900",
              )}
              style={{
                width: `${Math.max(8, state.label.length)}ch`,
              }}
              id="label"
              required
              value={state.label}
              type="text"
              onChange={(e) =>
                dispatch({ field: e.target.id, value: e.target.value })
              }
              onBlur={onBlur}
            />
          </form>
        )}
      </>
    </button>
  );
};

ResourceGroupNode.displayName = "ResourceGroupNode";
export default ResourceGroupNode;
