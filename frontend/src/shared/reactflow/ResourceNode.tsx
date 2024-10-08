import type { FC } from "react";
import React, {
  memo,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Handle, Position, useStore, useUpdateNodeInternals } from "reactflow";
import { NodeIcon } from "../resources/ResourceMappings";
import useApplicationStore from "../../pages/store/ApplicationStore";

import "./NodeStyles.scss";
import reducer from "../../helpers/reducer";
import { NodeId } from "../architecture/TopologyNode";
import classNames from "classnames";
import {
  RightSidebarDetailsTab,
  RightSidebarMenu,
} from "../../shared/sidebar-nav";
import { TbDotsCircleHorizontal } from "react-icons/tb";
import type { IconProps } from "../../components/editor/Icon";
import { Tooltip, useThemeMode } from "flowbite-react";
import { canModifyTopology } from "../EditorViewSettings";

interface ResourceNodeProps {
  id: string;
  data: any;
  isConnectable: boolean;
}

const connectionNodeIdSelector = (state: any) => state.connectionNodeId;

const ResourceNode = memo(({ id, data, isConnectable }: ResourceNodeProps) => {
  const {
    environmentVersion,
    selectedResource,
    replaceResource,
    selectNode,
    selectResource,
    navigateRightSidebar,
    edgeTargetState: { validTargets, existingEdges },
    viewSettings,
  } = useApplicationStore();

  const connectionNodeId = useStore(connectionNodeIdSelector);
  const isConnecting = !!connectionNodeId;
  const isSelected = selectedResource?.equals(data.resourceId);
  const [mouseOverNode, setMouseOverNode] = useState(false);
  const showSourceHandle = !isConnecting && mouseOverNode;
  const updateNodeInternals = useUpdateNodeInternals();

  const isValidConnectionTarget =
    isConnecting &&
    connectionNodeId !== id &&
    (validTargets.get(connectionNodeId) ?? []).includes(id);

  const isInvalidConnectionTarget =
    isConnecting &&
    connectionNodeId !== id &&
    validTargets.size &&
    !existingEdges.get(connectionNodeId)?.includes(id) &&
    !(validTargets.get(connectionNodeId) ?? []).includes(id);

  const onClickResourceIcon = () => {
    selectResource(data.resourceId);
    selectNode(id);
    navigateRightSidebar([
      RightSidebarMenu.Details,
      RightSidebarDetailsTab.Config,
    ]);
  };

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, viewSettings]);

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
          isConnectable={isConnectable}
        />
      );
    });
  }, [updateNodeInternals, id, data, isConnectable]);

  const quickIcons = useMemo(() => {
    if (data.vizMetadata?.children === undefined) {
      return;
    }

    const onClickQuickAction = (element: NodeId) => {
      selectResource(element);
      navigateRightSidebar([
        RightSidebarMenu.Details,
        RightSidebarDetailsTab.Config,
      ]);
    };

    const quickActions = data.vizMetadata?.children.map((element: NodeId) => {
      return (
        <Tooltip content={element.toString()} key={element.toString()}>
          <ResourceIcon
            key={`${data.resourceId.toString()}-nav-to-${element.toString()}`}
            data={data}
            resourceId={element}
            iconProps={{
              width: "25px",
              height: "25px",
            }}
            onClick={onClickQuickAction}
          />
        </Tooltip>
      );
    });

    if (quickActions === undefined) {
      return;
    }
    return [
      ...quickActions.slice(0, 2),
      <AdditionalResourcesAction
        key={`${data.resourceId.toString()}-dots`}
        resourceId={data.resourceId}
      />,
    ];
  }, [data, navigateRightSidebar, selectResource]);

  return (
    <>
      {/* eslint-disable-next-line tailwindcss/no-custom-classname,jsx-a11y/no-static-element-interactions */}
      <div
        className="resource-node resource-icon-node pointer-events-none absolute flex h-fit w-[210px] flex-col justify-center"
        onMouseOver={() => {
          setMouseOverNode(true);
        }}
        onMouseLeave={() => {
          setMouseOverNode(false);
        }}
        onFocus={() => {
          setMouseOverNode(true);
        }}
        onBlur={() => {
          setMouseOverNode(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onClickResourceIcon();
          }
        }}
      >
        <div
          className={classNames(
            "p-1 border-2 w-[100px] h-[100px] mx-auto rounded-md bg-transparent pointer-events-auto",
            {
              "border-primary-600/100 dark:border-primary-500/100 shadow-md shadow-primary-100 dark:shadow-primary-900":
                isSelected && (!isConnecting || connectionNodeId === id),
              "border-primary-600/[0]": !isSelected && !isValidConnectionTarget,
              "bg-blue-500/10 border-blue-700 dark:border-blue-200 shadow-md shadow-blue-100 dark:shadow-blue-900":
                mouseOverNode && isValidConnectionTarget,
              "bg-blue-500/5 border-blue-400 dark:border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900":
                !mouseOverNode && isValidConnectionTarget,
              "bg-red-500/10 border-red-600 dark:border-red-600 shadow-md shadow-red-100 dark:shadow-red-900":
                !isSelected && isInvalidConnectionTarget && mouseOverNode,
            },
          )}
        >
          <ResourceIcon
            data={data}
            resourceId={data.resourceId}
            iconProps={{
              width: "100px",
              height: "100px",
            }}
            onClick={onClickResourceIcon}
          />
          {isConnecting && (
            <Handle
              // eslint-disable-next-line tailwindcss/no-custom-classname
              className="full-icon-handle"
              id={`${id}-dnd-target`}
              position={Position.Left}
              type="target"
            />
          )}
        </div>
        {handles}
        {canModifyTopology(viewSettings) && (
          <Handle
            className={classNames("node-handle", {
              "opacity-0": !showSourceHandle,
            })}
            id={`${id}-dnd-source`}
            position={Position.Right}
            type="source"
          >
            <div className="handle-source handle-right pointer-events-none">
              &nbsp;
            </div>
          </Handle>
        )}

        <EditableLabel
          disabled={!canModifyTopology(viewSettings)}
          label={data.label}
          onSubmit={async (newValue) => {
            const { provider, type, namespace } = data.resourceId;
            await replaceResource(
              data.resourceId,
              new NodeId(type, namespace, newValue, provider),
            );
          }}
        ></EditableLabel>
        <div className={"text-center dark:text-gray-200"}>
          <i className="pointer-events-auto">
            {data.resourceId.provider === environmentVersion.provider
              ? data.resourceId.type
              : `${data.resourceId.provider}:${data.resourceId.type}`}
          </i>
        </div>
        <div className="pointer-events-auto flex flex-row justify-center gap-2 pt-1">
          {quickIcons}
        </div>
      </div>
    </>
  );
});
ResourceNode.displayName = "ResourceNode";

type ResourceIconProps = {
  resourceId: NodeId;
  data: any;
  onClick?: (resourceId: NodeId) => void;
  className?: string;
  iconProps?: IconProps;
};

const ResourceIcon: FC<ResourceIconProps> = ({
  className,
  data,
  resourceId,
  onClick,
  iconProps,
}) => {
  const { mode } = useThemeMode();
  return (
    <button
      className={className}
      onClick={() => onClick?.(resourceId)}
      type="button"
    >
      <NodeIcon
        provider={resourceId.provider}
        type={resourceId.type}
        data={data}
        variant={mode}
        {...iconProps}
      />
    </button>
  );
};

type EditableLabelProps = {
  label: string;
  disabled?: boolean;
  onSubmit?: (newValue: string) => void;
};

const EditableLabel: FC<EditableLabelProps> = ({
  label,
  disabled,
  onSubmit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    label,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [shouldSelectContent, setShouldSelectContent] = useState(true);

  const onBlur = (e: any) => {
    if (e.relatedTarget !== inputRef.current) {
      if (state.label !== label) {
        onSubmit?.(state.label);
      }
      setIsEditing(false);
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditing(false);
        dispatch({ field: "label", value: label });
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isEditing, label]);

  return (
    <div className="flex w-full justify-center dark:text-gray-200">
      <>
        {!isEditing && (
          <button
            className={classNames(
              "flex w-fit max-w-[210px] justify-center border-[1px] border-gray-500/[0] px-1",
              {
                "pointer-events-auto cursor-text hover:rounded-sm hover:border-gray-500 hover:bg-gray-100/20 dark:hover:bg-gray-700/20":
                  !disabled,
              },
            )}
            disabled={disabled}
            onClick={() => {
              setIsEditing(true);
              setShouldSelectContent(true);
            }}
          >
            <div
              className={"h-fit max-w-[196px] truncate break-all font-semibold"}
            >
              {label}
            </div>
          </button>
        )}
        {isEditing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (state.label !== label) {
                onSubmit?.(state.label);
                // reset the label in case of failure, if success it will get reset anyways
                state.label = label;
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
              className="max-w-[196px] overflow-x-visible rounded-sm border bg-gray-50 p-1 text-center focus:border-gray-50 dark:bg-gray-900"
              style={{ width: `${Math.max(8, state.label.length)}ch` }}
              id="label"
              required
              value={state.label}
              type="text"
              onBlur={onBlur}
              onChange={(e) =>
                dispatch({ field: e.target.id, value: e.target.value })
              }
            />
          </form>
        )}
      </>
    </div>
  );
};

type AdditionalResourcesProps = {
  resourceId: NodeId;
};
const AdditionalResourcesAction: FC<AdditionalResourcesProps> = ({
  resourceId,
}) => {
  const { selectResource, navigateRightSidebar } = useApplicationStore();
  return (
    <Tooltip content={"Additional resources"}>
      <button
        className="size-[25px]"
        type="button"
        onClick={() => {
          selectResource(resourceId);
          navigateRightSidebar([
            RightSidebarMenu.Details,
            RightSidebarDetailsTab.AdditionalResources,
          ]);
        }}
      >
        <TbDotsCircleHorizontal
          className="text-gray-800 dark:text-gray-200"
          size="25px"
        />
      </button>
    </Tooltip>
  );
};

export default ResourceNode;
