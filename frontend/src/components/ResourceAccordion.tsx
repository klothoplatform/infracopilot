import type { MouseEventHandler } from "react";
import * as React from "react";
import { useEffect } from "react";
import { Accordion, Badge, Card } from "flowbite-react";
import { typeMappings } from "../shared/reactflow/ResourceMappings";

import "./ResourceAccordion.scss";
import classNames from "classnames";
import { FaAngleUp } from "react-icons/fa";

interface ResourceAccordionOptions {
  name: string;
  icon: React.ReactElement;
  open?: boolean;
  filter?: FilterFunction;
  layout?: "grid" | "list";
}

interface ResourceOption {
  provider: string;
  type: string;
  name: string;
  icon: CallableFunction;
}

type ResourceCardProps = {
  orientation?: "horizontal" | "vertical";
  option: ResourceOption;
  onDragStart: (event: any, nodeType: string) => void;
};

export type FilterFunction = (type: string) => boolean;

export default function ResourceAccordion({
  name,
  icon,
  open,
  filter,
  layout,
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
  }, [filter, mappings, provider, setOptions]);

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
    <Accordion.Panel isOpen={isOpen} arrowIcon={FaAngleUp}>
      <Accordion.Title
        aria-controls="panel1bh-content"
        id="panel1bh-header"
        onClick={onTitleClick}
        className={"flex w-full"}
      >
        <div className={"mr-3 flex w-full"}>
          <div className={"h-[20px] min-h-[20px] w-[20px] min-w-[20px]"}>
            {icon}
          </div>
          <div className={"ml-3"}>{name}</div>
          <div className={"ml-auto mr-3"}>
            {showResourceCount && (
              <Badge color={"purple"} className={"ml-2"}>
                {options?.length ?? 0}
              </Badge>
            )}
          </div>
        </div>
      </Accordion.Title>
      <Accordion.Content className="px-1 py-2">
        <div
          className={classNames(
            "mb-4 flex w-full flex-wrap content-start gap-2 px-2",
            {
              "flex-col": layout === "list",
            },
          )}
        >
          {options.map((option: ResourceOption) => {
            // eslint-disable-next-line react/jsx-key
            return (
              <ResourceCard
                key={`${option.provider}:${option.type}`}
                option={option}
                onDragStart={onDragStart}
                orientation={layout === "list" ? "horizontal" : "vertical"}
              />
            );
          })}
        </div>
      </Accordion.Content>
    </Accordion.Panel>
  );
}

const ResourceCard = ({
  option,
  onDragStart,
  orientation,
}: ResourceCardProps) => {
  return (
    <Card
      title={option.name}
      className={classNames(
        "shadow-sm hover:border-2 hover:border-purple-500 hover:bg-purple-50 dark:hover:border-purple-500 dark:hover:bg-purple-900 hover:shadow-md dark:text-white",
        {
          "h-[100px] w-[100px] shrink-0 grow-0 basis-[100px]":
            orientation !== "horizontal",
          "min-h-[40px] max-h-[40px] justify-center items-start w-full max-w-full":
            orientation === "horizontal",
        },
      )}
      onDragStart={(event) =>
        onDragStart(event, `${option.provider}:${option.type}`)
      }
      draggable
    >
      {orientation !== "horizontal" && (
        <div className={"flex flex-col justify-center gap-2"}>
          <option.icon className="fixed-image mx-auto h-[50px] w-[50px]" />
          <div className={"mx-auto max-w-[85%] truncate text-center text-xs"}>
            {option.name}
          </div>
        </div>
      )}
      {orientation === "horizontal" && (
        <div className="mx-2 flex h-full max-w-full items-center gap-3">
          <option.icon className="fixed-image mx-auto h-[30px] w-[30px] shrink-0 grow-0" />
          <div className={"mx-auto truncate text-start text-xs"}>
            {option.name}
          </div>
        </div>
      )}
    </Card>
  );
};
