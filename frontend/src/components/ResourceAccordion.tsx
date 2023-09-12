import type { MouseEventHandler } from "react";
import * as React from "react";
import { useEffect } from "react";
import type { CustomFlowbiteTheme } from "flowbite-react";
import { Accordion, Badge, Card } from "flowbite-react";
import { typeMappings } from "../shared/reactflow/ResourceMappings";

import "./ResourceAccordion.scss";
import { HiArrowUp } from "react-icons/hi";
import { AiFillCaretUp } from "react-icons/ai";

interface ResourceAccordionOptions {
  name: string;
  icon: React.ReactElement;
  open?: boolean;
  filter?: FilterFunction;
}

interface ResourceOption {
  provider: string;
  type: string;
  name: string;
  icon: CallableFunction;
}

type ResourceCardProps = {
  option: ResourceOption;
  onDragStart: (event: any, nodeType: string) => void;
};

export type FilterFunction = (type: string) => boolean;

const theme: CustomFlowbiteTheme["accordion"] = {};

export default function ResourceAccordion({
  name,
  icon,
  open,
  filter,
}: ResourceAccordionOptions) {
  const provider = name.toLowerCase();
  const mappings = typeMappings.get(provider);
  const [options, setOptions] = React.useState<ResourceOption[]>(() => {
    return mappings
      ? Array.from(mappings.entries())
          .filter(([type, mapping]) => filter?.(type) ?? true)
          .map(([type, mapping]) => {
            return {
              provider: provider,
              type: type,
              name: type
                .split("_")
                .map(
                  ([firstChar, ...rest]) =>
                    firstChar.toUpperCase() + rest.join("").toLowerCase(),
                )
                .join(" "),
              icon: mapping instanceof Function ? mapping : mapping.nodeIcon,
            };
          })
      : [];
  });

  useEffect(() => {
    setOptions(
      Array.from(mappings?.entries() ?? [])
        .filter(([type, mapping]) => filter?.(type) ?? true)
        .map(([type, mapping]) => {
          return {
            provider: provider,
            type: type,
            name: type
              .split("_")
              .map(
                ([firstChar, ...rest]) =>
                  firstChar.toUpperCase() + rest.join("").toLowerCase(),
              )
              .join(" "),
            icon: mapping instanceof Function ? mapping : mapping.nodeIcon,
          };
        }),
    );
  }, [filter, mappings, options, provider, setOptions]);

  const [isOpen, setIsOpen] = React.useState(open);
  const [showResourceCount, setShowResourceCount] = React.useState(false);

  const onDragStart = (event: any, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onTitleClick: MouseEventHandler = (event) => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (filter) {
      setShowResourceCount(true);
      if (options?.length) {
        if (isOpen === undefined) setIsOpen(true);
      } else {
        setIsOpen(undefined);
      }
    } else {
      setShowResourceCount(false);
    }
  }, [setIsOpen, setShowResourceCount, filter, options, isOpen]);

  return (
    <Accordion.Panel
      isOpen={isOpen}
      className={"flex w-full"}
      arrowIcon={AiFillCaretUp}
    >
      <Accordion.Title
        aria-controls="panel1bh-content"
        id="panel1bh-header"
        onClick={onTitleClick}
        className={"flex w-full"}
      >
        <div className={"mr-3 inline-flex w-full"}>
          <div className={"flex h-[20px] w-[20px] basis-1/12"}>{icon}</div>
          <div className={"ml-3 flex basis-10/12"}>{name}</div>
          <div className={"mr-3 flex basis-1/12"}>
            {showResourceCount && (
              <Badge color={"purple"} className={"ml-2"}>
                {options?.length ?? 0}
              </Badge>
            )}
          </div>
        </div>
      </Accordion.Title>
      <Accordion.Content className="mb-4 overflow-y-scroll px-0">
        <div className={"grid max-h-[40vh] max-w-max grid-cols-3 gap-2"}>
          {options.map((option: ResourceOption) => {
            // eslint-disable-next-line react/jsx-key
            return (
              <ResourceCard
                key={`${option.provider}:${option.type}`}
                option={option}
                onDragStart={onDragStart}
              />
            );
          })}
        </div>
      </Accordion.Content>
    </Accordion.Panel>
  );
}

const ResourceCard = ({ option, onDragStart }: ResourceCardProps) => {
  return (
    <Card
      className={"mx-auto mr-2 flex h-[100px] w-[100px] dark:text-white"}
      onDragStart={(event) =>
        onDragStart(event, `${option.provider}:${option.type}`)
      }
      draggable
    >
      <option.icon className="mx-auto h-[50px] w-[50px]" />
      <div className={"mx-auto mb-2 max-w-[85%] truncate text-center text-xs"}>
        {option.name}
      </div>
    </Card>
  );
};
