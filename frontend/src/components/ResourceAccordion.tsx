import type { MouseEventHandler } from "react";
import * as React from "react";
import { useEffect } from "react";
import { Accordion, Badge, Card } from "flowbite-react";
import { typeMappings } from "../shared/reactflow/ResourceMappings";

import "./ResourceAccordion.scss";
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
    <Accordion.Panel isOpen={isOpen} arrowIcon={AiFillCaretUp}>
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
      <Accordion.Content className="py-2">
        <div className="mb-4 flex max-h-[40vh] w-full flex-wrap content-start gap-[6px] overflow-y-auto px-2">
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
      className={
        "h-[100px] w-[100px] shrink-0 grow-0 basis-[100px] dark:text-white"
      }
      onDragStart={(event) =>
        onDragStart(event, `${option.provider}:${option.type}`)
      }
      draggable
    >
      <option.icon className="fixed-image mx-auto h-[50px] w-[50px]" />
      <div className={"mx-auto mb-2 max-w-[85%] truncate text-center text-xs"}>
        {option.name}
      </div>
    </Card>
  );
};
