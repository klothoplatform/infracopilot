import type { MouseEventHandler } from "react";
import * as React from "react";
import { useEffect } from "react";
import { Accordion, Badge, Card, useThemeMode } from "flowbite-react";

import "./ResourceAccordion.scss";
import classNames from "classnames";
import { FaAngleDown } from "react-icons/fa6";
import type { ResourceTypeFilter } from "../../shared/resources/ResourceTypes";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { NodeIcon } from "../../shared/resources/ResourceMappings";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../FallbackRenderer";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";

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
            (userFilter === undefined || userFilter(r.displayName)),
        )
        .map((resourceType) => {
          return {
            provider: resourceType.provider,
            type: resourceType.type,
            name: resourceType.displayName,
          };
        }),
    );
  }, [resourceTypeKB, resourceFilter, userFilter, setOptions, isAuthenticated]);

  const [isOpen, setIsOpen] = React.useState(open);
  const [showResourceCount, setShowResourceCount] = React.useState(false);

  const onDragStart = (event: any, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onTitleClick: MouseEventHandler = () => {
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

  useEffect(() => {
    if (!userFilter && isOpen !== false) {
      setIsOpen(true);
    }
  }, [isOpen, userFilter]);

  const filteredTypes = resourceTypeKB.getResourceTypes(resourceFilter);
  if (!filteredTypes.length) {
    return null; // Don't render an accordion that has no resources even before applying the user filter
  }

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
            <div className={"size-[20px] min-h-[20px] min-w-[20px]"}>
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
        <ErrorBoundary
          fallbackRender={FallbackRenderer}
          onError={(error, componentStack) => {
            trackError(
              new UIError({
                errorId: "ResourceAccordion:ErrorBoundary",
                message: "uncaught error in ResourceAccordion",
                cause: error,
                data: componentStack,
              }),
            );
          }}
        ></ErrorBoundary>
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
  const { mode } = useThemeMode();

  return (
    <Card
      title={option.name}
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
          <NodeIcon
            provider={option.provider}
            type={option.type}
            variant={mode}
            className="fixed-image h-[50px]v mx-auto w-[50px]"
          />
          <div className={"mx-auto max-w-[85%] truncate text-center text-xs"}>
            {option.name}
          </div>
        </div>
      )}
      {orientation === "horizontal" && (
        <div className="my-3 ml-1 flex size-full items-center gap-3">
          <NodeIcon
            provider={option.provider}
            type={option.type}
            variant={mode}
            className="fixed-image size-[30px] shrink-0 grow-0"
          />
          <div className={"truncate text-start text-xs"}>{option.name}</div>
        </div>
      )}
    </Card>
  );
};
