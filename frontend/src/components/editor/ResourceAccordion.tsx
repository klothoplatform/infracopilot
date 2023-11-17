import type { MouseEventHandler } from "react";
import * as React from "react";
import { useContext, useEffect } from "react";
import { Accordion, Badge, Card, Tooltip } from "flowbite-react";

import "./ResourceAccordion.scss";
import classNames from "classnames";
import { FaAngleDown } from "react-icons/fa";
import { ThemeContext } from "flowbite-react/lib/esm/components/Flowbite/ThemeContext";
import type { ResourceTypeFilter } from "../../shared/resources/ResourceTypes";
import useApplicationStore from "../../views/store/ApplicationStore";
import { getIcon } from "../../shared/resources/ResourceMappings";

interface ResourceAccordionOptions {
  name: string;
  icon?: React.JSX.Element;
  open?: boolean;
  userFilter?: FilterFunction;
  layout?: "grid" | "list";
  resourceFilter?: ResourceTypeFilter;
}

interface ResourceOption {
  provider: string;
  type: string;
  name: string;
  icon: React.JSX.Element;
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
  userFilter,
  layout,
  resourceFilter,
}: ResourceAccordionOptions) {
  const { mode } = useContext(ThemeContext);
  const [options, setOptions] = React.useState<ResourceOption[]>([]);
  const { resourceTypeKB, isAuthenticated } = useApplicationStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    const filteredTypes = resourceTypeKB.getResourceTypes(resourceFilter);
    setOptions(
      Array.from(filteredTypes?.values() ?? [])
        .filter(
          (r) =>
            r.classifications?.length &&
            (userFilter === undefined || userFilter(r.type)),
        )
        .map((resourceType) => {
          return {
            provider: resourceType.provider,
            type: resourceType.type,
            name: resourceType.displayName,
            icon: getIcon(
              resourceType.provider,
              resourceType.type,
              undefined,
              undefined,
              mode,
            ),
          };
        }),
    );
  }, [
    resourceTypeKB,
    resourceFilter,
    userFilter,
    setOptions,
    mode,
    isAuthenticated,
  ]);

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
    if (userFilter) {
      setShowResourceCount(true);
      if (options?.length) {
        if (isOpen === undefined) setIsOpen(true);
      } else {
        setIsOpen(undefined);
      }
    } else {
      setShowResourceCount(false);
    }
  }, [setIsOpen, setShowResourceCount, userFilter, options, isOpen]);

  return (
    <Accordion.Panel isOpen={isOpen} arrowIcon={FaAngleDown}>
      <Accordion.Title
        aria-controls="panel1bh-content"
        id="panel1bh-header"
        onClick={onTitleClick}
        className={"flex w-full px-2 py-2.5 [&>h2]:w-full [&>h2]:text-ellipsis"}
      >
        <div className={"mr-3 flex w-full"}>
          {icon && (
            <div className={"h-[20px] min-h-[20px] w-[20px] min-w-[20px]"}>
              {icon}
            </div>
          )}
          <div className={"ml-3"}>{name}</div>
          <div className={"ml-auto mr-3 place-self-end"}>
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
            "flex w-full flex-wrap content-start gap-2 px-2",
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
    <Tooltip content={option.name}>
      <Card
        className={classNames(
          "shadow-sm hover:border-2 hover:border-primary-500 hover:bg-primary-50 dark:hover:border-primary-500 dark:hover:bg-primary-900 hover:shadow-md dark:text-white",
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
            {React.cloneElement(option.icon, {
              className: "fixed-image mx-auto h-[50px] w-[50px]",
            })}
            <div className={"mx-auto max-w-[85%] truncate text-center text-xs"}>
              {option.name}
            </div>
          </div>
        )}
        {orientation === "horizontal" && (
          <div className="mx-2 flex h-full max-w-full items-center gap-3">
            {React.cloneElement(option.icon, {
              className:
                "fixed-image mx-auto h-[30px] w-[30px] shrink-0 grow-0",
            })}
            <div className={"mx-auto truncate text-start text-xs"}>
              {option.name}
            </div>
          </div>
        )}
      </Card>
    </Tooltip>
  );
};
