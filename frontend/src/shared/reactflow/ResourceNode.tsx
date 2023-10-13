import type { FC } from "react";
import React, {
  memo,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Handle, Position, useStore, useUpdateNodeInternals } from "reactflow";
import { getIcon } from "./ResourceMappings";
import useApplicationStore from "../../views/store/ApplicationStore";

import "./NodeStyles.scss";
import reducer from "../../helpers/reducer";
import { NodeId } from "../architecture/TopologyNode";
import classNames from "classnames";
import {
  RightSidebarDetailsTabs,
  RightSidebarTabs,
} from "../../shared/sidebar-nav";
import { TbDotsCircleHorizontal } from "react-icons/tb";
import { ThemeContext } from "flowbite-react/lib/esm/components/Flowbite/ThemeContext";
import type { IconProps } from "../../components/Icon";

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
  const isSelected = selectedResource === data.resourceId;
  const [mouseOverNode, setMouseOverNode] = useState(false);
  // this could be a map by handle id
  const [mouseOverHandle, setMouseOverHandle] = useState(false);
  const showSourceHandle = !isConnecting && (mouseOverNode || mouseOverHandle);
  const updateNodeInternals = useUpdateNodeInternals();

  const onClickResourceIcon = () => {
    selectResource(data.resourceId);
    selectNode(id);
    navigateRightSidebar([
      RightSidebarTabs.Details,
      RightSidebarDetailsTabs.Config,
    ]);
  };

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
        RightSidebarTabs.Details,
        RightSidebarDetailsTabs.Config,
      ]);
    };

    const quickActions = data.vizMetadata?.children.map((element: NodeId) => {
      return (
        <ResourceIcon
          key={`${data.resourceId.toKlothoIdString()}-nav-to-${element.toKlothoIdString()}`}
          data={data}
          resourceId={element}
          iconProps={{
            height: "25px",
            width: "25px",
          }}
          onClick={onClickQuickAction}
        />
      );
    });

    if (quickActions === undefined) {
      return;
    }
    return [
      ...quickActions.slice(0, 2),
      <AdditionalResourcesAction
        key={`${data.resourceId.toKlothoIdString()}-dots`}
        resourceId={data.resourceId}
      />,
    ];
  }, [data, navigateRightSidebar, selectResource]);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/mouse-events-have-key-events,tailwindcss/no-custom-classname */}
      <div
        className="resource-node pointer-events-none absolute flex h-fit w-[210px] flex-col justify-center"
        onMouseOver={(e) => {
          setMouseOverNode(true);
        }}
        onMouseLeave={(e) => {
          setMouseOverNode(false);
        }}
      >
        <div
          className={classNames(
            "p-1 border-2 w-[100px] h-[100px] mx-auto rounded-md bg-transparent pointer-events-auto",
            {
              "border-primary-600/100 dark:border-primary-500/100": isSelected,
              "border-primary-600/[0]": !isSelected,
            },
          )}
        >
          <ResourceIcon
            data={data}
            resourceId={data.resourceId}
            iconProps={{
              height: "100px",
              width: "100px",
            }}
            onClick={onClickResourceIcon}
          />
        </div>
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

        <EditableLabel
          label={data.label}
          onSubmit={async (newValue) => {
            const { provider, type, namespace } = data.resourceId;
            await replaceResource(
              data.resourceId,
              new NodeId(type, namespace, newValue, provider),
            );
            if (
              selectedResource?.toKlothoIdString() ===
              data.resourceId.toKlothoIdString()
            ) {
              selectResource(new NodeId(type, namespace, newValue, provider));
            }
          }}
        ></EditableLabel>
        <div className={"text-center dark:text-gray-200"}>
          <i>
            {data.resourceId.provider === architecture.provider
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
  iconProps?: IconProps;
  onClick?: (resourceId: NodeId) => void;
  className?: string;
};

const ResourceIcon: FC<ResourceIconProps> = ({
  className,
  data,
  resourceId,
  onClick,
  iconProps,
}) => {
  const { mode } = useContext(ThemeContext);
  return (
    <button
      className={className}
      onClick={() => onClick?.(resourceId)}
      type="button"
    >
      {getIcon(resourceId.provider, resourceId.type, iconProps, data, mode)}
    </button>
  );
};

type EditableLabelProps = {
  label: string;
  onSubmit?: (newValue: string) => void;
};

const EditableLabel: FC<EditableLabelProps> = ({ label, onSubmit }) => {
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
    <button
      onClick={() => {
        setIsEditing(true);
        setShouldSelectContent(true);
      }}
      className="pointer-events-auto flex w-full justify-center dark:text-gray-200"
    >
      <>
        {!isEditing && (
          <div className="flex w-fit max-w-[210px] cursor-text justify-center border-[1px] border-gray-500/[0] border-opacity-0 px-1 hover:rounded-sm hover:border-gray-500 hover:bg-gray-100/20 dark:hover:bg-gray-700/20">
            <div
              className={"h-fit max-w-[196px] truncate break-all font-semibold"}
            >
              {label}
            </div>
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
              className="max-w-[196px] overflow-x-visible rounded-sm border-[1px] bg-gray-50 p-1 text-center focus:border-gray-50 dark:bg-gray-900"
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
    </button>
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
