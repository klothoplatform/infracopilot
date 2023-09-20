"use client";

import type { CustomFlowbiteTheme } from "flowbite-react";
import {
  Button,
  Card,
  Checkbox,
  Table,
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

export default function ConfigTable() {
  const { architecture, selectedResource, configureResources } =
    useApplicationStore();

  const metadata = ((architecture?.resourceMetadata as any[]) ?? [])?.find(
    (e) => {
      return e.id === selectedResource?.toKlothoIdString();
    },
  )?.metadata;

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

  const rows = Object.entries(metadata ?? {}).map(([key, value]) => {
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
      console.log("changed!!");
      dispatch({
        field: key,
        value: {
          type: state[key]?.type,
          value: e.target.value,
          modified: true,
        },
      });
    };
    return (
      <Table.Row
        key={key}
        className="bg-white dark:border-gray-700 dark:bg-gray-800"
      >
        <Table.Cell className="max-w-fit whitespace-break-spaces font-medium text-gray-900 dark:text-gray-200">
          {key}
        </Table.Cell>
        <Table.Cell className="w-full">
          <ConfigField
            type={inputType}
            id={`config-${key}`}
            value={state[key]?.value}
            onChange={onChange}
            readOnly
          />
        </Table.Cell>
      </Table.Row>
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
            <Card theme={cardTheme} className="max-h-[50vh] overflow-auto">
              <Table striped>
                <Table.Body className="divide-y">{rows}</Table.Body>
              </Table>
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
            "border-primary-400 border-2 rounded-lg": isModified,
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
            "border-primary-400 border-2 rounded-lg": isModified,
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
            "border-primary-400 border-2 rounded-lg": isModified,
          })}
          id={id}
          value={value}
          onChange={handleChange}
          type={type}
        />
      );
  }
};
