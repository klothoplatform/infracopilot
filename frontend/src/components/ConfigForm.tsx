"use client";

import type { CustomFlowbiteTheme } from "flowbite-react";
import {
  Button,
  Card,
  Checkbox,
  Label,
  Textarea,
  TextInput,
} from "flowbite-react";
import type { ResourceConfigurationRequest } from "../views/store/store";
import useApplicationStore from "../views/store/store";
import type { FC } from "react";
import React, { useReducer, useState } from "react";
import fieldsReducer from "../helpers/reducer";
import classNames from "classnames";
import type { NodeId } from "../shared/architecture/TopologyNode";

const cardTheme: CustomFlowbiteTheme["card"] = {
  root: {
    base: "flex h-full rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800",
    children: "flex h-full flex-col justify-space-between",
  },
};

export default function ConfigForm() {
  const { architecture, selectedResource, configureResources } =
    useApplicationStore();

  const metadata = selectedResource
    ? architecture?.resources?.get(selectedResource.toKlothoIdString())
    : {};

  let initialState = {} as any;
  if (metadata) {
    initialState = Object.assign(
      {},
      ...Object.entries(metadata).map(([key, value]) => {
        return {
          [key]: {
            type: typeof value,
            value:
              typeof value === "string" || typeof value === "number"
                ? value
                : JSON.stringify(value, null, 2),
          },
        };
      }),
    );
  }

  const [state, dispatch] = useReducer(fieldsReducer, initialState);

  const rows = Object.entries(metadata ?? {}).map(([key, value], i) => {
    let inputType: ConfigFieldType = "textarea";
    switch (state[key]?.type) {
      case "boolean":
        inputType = "checkbox";
        break;
      case "number":
        inputType = "number";
        break;
      case "string":
        inputType = "text";
        break;
    }

    const onChange = (e: any) => {
      dispatch({
        field: key,
        value: {
          type: state[key]?.type,
          value: e.target.value,
          modified: true,
        },
      });
    };
    const id = `config-field-${i}`;
    return (
      <div key={id} className="h-fit max-w-full px-2">
        <div className="mb-2 block">
          <Label htmlFor={id} value={key} />
        </div>
        <ConfigField
          type={inputType}
          id={id}
          value={state[key]?.value}
          onChange={onChange}
          readOnly
        />
      </div>
    );
  });

  const submitConfigChanges = async (e: any) => {
    e.preventDefault();
    const configRequests = Object.keys(state)
      .map((key) => {
        return {
          property: key,
          ...state[key],
        };
      })
      .filter((prop) => prop.modified)
      .map((prop): ResourceConfigurationRequest => {
        return {
          resourceId: selectedResource as NodeId,
          property: prop.property,
          value: prop.type === "string" ? prop.value : JSON.parse(prop.value),
        };
      });
    console.log(configRequests);
    if (!configRequests.length) {
      return;
    }
    await configureResources(configRequests);
  };

  return (
    <>
      {rows.length > 0 && (
        <div className={"w-full"}>
          <form>
            <Card
              theme={cardTheme}
              className="max-h-[50vh]] overflow-auto py-2"
            >
              <div className="max-h-[50vh] overflow-auto [&>*:not(:last-child)]:mb-2">
                {rows}
              </div>
            </Card>
            <Button
              type="submit"
              color="purple"
              onClick={submitConfigChanges}
              className="my-2 w-full"
            >
              Apply Changes
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

type ConfigFieldType = "text" | "textarea" | "checkbox" | "number";

type ConfigFieldProps = {
  id: string;
  type: ConfigFieldType;
  readOnly?: boolean;
  onChange?: (e: any) => void;
  dispatch?: CallableFunction;
  value?: string;
  color?: string;
};

const ConfigField: FC<ConfigFieldProps> = ({
  id,
  type,
  onChange,
  value,
  readOnly,
  color,
}) => {
  const [isModified, setIsModified] = useState(false);

  const handleChange = (e: any) => {
    onChange?.(e);
    setIsModified(true);
  };

  switch (type) {
    case "textarea":
      return (
        <Textarea
          className={classNames({
            "border-primary-500 border-2 rounded-lg dark:border-primary-400 dark:border-2 dark:rounded-lg":
              isModified,
          })}
          id={id}
          value={value}
          onChange={handleChange}
        />
      );
    case "checkbox":
      return (
        <Checkbox
          className={classNames({
            "accent-primary-500 text-primary-500 dark:accent-primary-400 dark:text-primary-400":
              isModified,
          })}
          id={id}
          value={value}
          onChange={handleChange}
        />
      );
    case "text":
    case "number":
    default:
      return (
        <TextInput
          className={classNames({
            "border-primary-500 dark:border-primary-400 border-2 rounded-lg dark:[&_input]:border-transparent [&_input]:border-transparent":
              isModified,
          })}
          id={id}
          value={value}
          onChange={handleChange}
          type={type}
        />
      );
  }
};
