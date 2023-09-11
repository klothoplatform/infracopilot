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
import { BiEdit } from "react-icons/bi";
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
    const [isEditingLabel, setIsEditingLabel] = useState(false);

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
          className="flex h-full w-full bg-white dark:bg-gray-800"
          style={{
            borderColor: "gray",
            boxShadow: `0px 0px 0px 2px ${
              iconMapping?.groupStyle?.borderColor ?? "gray"
            } inset`,
            ...iconMapping?.groupStyle,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              flexDirection: "row",
              verticalAlign: "top",
            }}
          >
            {getGroupIcon(
              data.resourceId.provider,
              data.resourceId.type,
              {
                style: {
                  width: "24px",
                  height: "24px",
                  marginRight: "4px",
                  ...iconMapping?.groupIconStyle,
                },
              },
              data,
            )}
          </span>
          <button
            className="flex font-bold dark:text-gray-200"
            style={{
              overflowWrap: "anywhere",
              paddingTop: "6px",
              paddingRight: "6px",
              paddingLeft: "6px",
            }}
            onClick={() => {
              console.log("clicked");
              setIsEditingLabel(true);
            }}
          >
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
                setIsEditingLabel(false);
              }}
              editing={isEditingLabel}
              initialValue={data.resourceId.name}
            />
          </button>
        </div>
      </>
    );
  },
);

type EditableLabelProps = {
  label: string;
  onSubmit?: (newValue: string) => void;
  editing?: boolean;
  initialValue?: string;
};

const EditableLabel: FC<EditableLabelProps> = ({
  editing,
  label,
  onSubmit,
  initialValue,
}) => {
  const [state, dispatch] = useReducer(reducer, { name: initialValue ?? "" });
  const { selectedNode } = useApplicationStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEditIcon, setShowEditIcon] = useState(false);

  useEffect(() => {
    if (editing) {
      onSubmit?.(state.name);
    }
  }, [selectedNode]);

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing, inputRef]);

  return (
    <div>
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
            id="name"
            required
            value={state.name}
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
              onSubmit?.(state.name);
            }}
          />
        </form>
      )}
    </div>
  );
};

ResourceGroupNode.displayName = "ResourceGroupNode";
export default ResourceGroupNode;
