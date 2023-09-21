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
import { getGroupIcon, getIconMapping } from "./ResourceMappings";
import { Handle, useUpdateNodeInternals } from "reactflow";
import reducer from "../../helpers/reducer";
import useApplicationStore from "../../views/store/store";
import classNames from "classnames";
import { NodeId } from "../architecture/TopologyNode";

interface GroupNodeProps {
  id: string;
  data: any;
  style?: object;
  isConnectable: boolean;
}

const ResourceGroupNode = memo(
  ({ id, data, isConnectable }: GroupNodeProps) => {
    const { architecture, replaceResource } = useApplicationStore();

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

    return (
      <>
        {handles}
        <div
          className={classNames(
            "flex h-full w-full border-gray-600 justify-start gap-1",
            {
              "bg-white dark:bg-gray-800": !data.isHighlighted,
              "bg-gray-200 dark:bg-gray-700": data.isHighlighted,
            },
          )}
          style={{
            boxShadow: `0px 0px 0px 2px ${
              iconMapping?.groupStyle?.borderColor ?? "gray"
            } inset`,
            ...iconMapping?.groupStyle,
          }}
        >
          <div className="relative min-h-[24px] min-w-[24px]">
            {getGroupIcon(
              data.resourceId.provider,
              data.resourceId.type,
              {
                style: {
                  width: "24px",
                  height: "24px",
                  ...iconMapping?.groupIconStyle,
                },
              },
              data,
            )}
          </div>
          <EditableLabel
            label={
              data.resourceId.provider === architecture.provider
                ? `${data.resourceId.type}/${data.resourceId.name}`
                : data.resourceId.toKlothoIdString()
            }
            onSubmit={async (newValue) => {
              const { provider, type, namespace } = data.resourceId;
              await replaceResource(
                data.resourceId,
                new NodeId(type, namespace, newValue, provider),
              );
            }}
            initialValue={data.resourceId.name}
          />
        </div>
      </>
    );
  },
);

type EditableLabelProps = {
  label: string;
  initialValue?: string;
  onSubmit?: (newValue: string) => void;
};

const EditableLabel: FC<EditableLabelProps> = ({
  initialValue,
  label,
  onSubmit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    label: initialValue ?? label,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const onBlur = (e: any) => {
    console.log("onBlur", e);
    if (e.relatedTarget !== inputRef.current) {
      if (state.label !== (initialValue ?? label)) {
        onSubmit?.(state.label);
      }
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <button
      onClick={() => setIsEditing(true)}
      className="h-fit max-w-[calc(100%-36px)] justify-start break-all text-start dark:text-gray-200"
    >
      <>
        {!isEditing && (
          <div className="line-clamp-2 rounded-sm border-[1px] border-gray-500/[0] border-opacity-0 px-1 font-semibold hover:border-gray-500 hover:bg-gray-100/20 dark:hover:bg-gray-700/20">
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
              ref={inputRef}
              className={classNames(
                "text-center overflow-x-visible rounded-sm border-[1px] bg-gray-50 p-1 text-left focus:border-gray-50 dark:bg-gray-900 p-0",
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
