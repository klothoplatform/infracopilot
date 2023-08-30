import * as React from "react";
import { Accordion, Card } from "flowbite-react";
import { typeMappings } from "../shared/reactflow/ResourceMappings";

import "./ResourceAccordion.scss";

interface DragSubmenuOptions {
  name: string;
  icon: React.ReactElement;
}

interface ResourceOption {
  provider: string;
  type: string;
  name: string;
  icon: CallableFunction;
}

export default function ResourceAccordion({ name, icon }: DragSubmenuOptions) {
  const provider = name.toLowerCase();
  const mappings = typeMappings.get(provider);
  let options: ResourceOption[] = [];
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

  return (
    <Accordion.Panel isOpen={true}>
      <Accordion.Title aria-controls="panel1bh-content" id="panel1bh-header">
        <div className={"inline w-fit"}>
          <span className={"inline-flex"}>{icon}</span>
          <span className={"ml-2 inline-flex"}>{name}</span>
        </div>
      </Accordion.Title>
      <Accordion.Content className={"overflow-visible overflow-y-scroll"}>
        <div className={"grid max-h-[40vh] grid-cols-3 gap-2"}>
          {options.map((option: ResourceOption) => {
            return (
              <Card
                className={"mx-auto block h-[120px] w-[120px]"}
                key={`${option.provider}:${option.type}`}
                onDragStart={(event) =>
                  onDragStart(event, `${option.provider}:${option.type}`)
                }
                draggable
              >
                <option.icon className="mx-auto h-[50px] w-[50px]" />
                <div
                  className={
                    "mx-auto mb-2 max-w-[85%] truncate text-center text-xs"
                  }
                >
                  {option.name}
                </div>
              </Card>
            );
          })}
        </div>
      </Accordion.Content>
    </Accordion.Panel>
  );
}
