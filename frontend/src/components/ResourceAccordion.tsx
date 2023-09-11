import type { MouseEventHandler } from "react";
import * as React from "react";
import { Accordion, Card, Tooltip } from "flowbite-react";
import { typeMappings } from "../shared/reactflow/ResourceMappings";

import "./ResourceAccordion.scss";

interface DragSubmenuOptions {
  name: string;
  icon: React.ReactElement;
  open?: boolean;
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

export default function ResourceAccordion({
  name,
  icon,
  open,
}: DragSubmenuOptions) {
  const provider = name.toLowerCase();
  const mappings = typeMappings.get(provider);
  let options: ResourceOption[] = [];

  const [isOpen, setIsOpen] = React.useState(open);

  if (mappings) {
    options = Array.from(mappings.entries()).map(([type, mapping]) => {
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
    });
  }

  const onDragStart = (event: any, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onTitleClick: MouseEventHandler = (event) => {
    setIsOpen(!isOpen);
  };

  return (
    <Accordion.Panel isOpen={isOpen}>
      <Accordion.Title
        aria-controls="panel1bh-content"
        id="panel1bh-header"
        onClick={onTitleClick}
      >
        <div className={"inline w-fit"}>
          <span className={"inline-flex"}>{icon}</span>
          <span className={"ml-2 inline-flex"}>{name}</span>
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
