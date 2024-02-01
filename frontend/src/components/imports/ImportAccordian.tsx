import classNames from "classnames";
import { Accordion, Button } from "flowbite-react";
import React, { type MouseEventHandler } from "react";
import { FaAngleDown } from "react-icons/fa6";

export interface ImportAccordianProps {
  name: string;
  icon?: React.JSX.Element;
  open?: boolean;
  setShowImportModal: (show: boolean) => void;
}

export default function ImportAccordion({
  name,
  icon,
  open,
  setShowImportModal,
}: ImportAccordianProps) {
  const [isOpen, setIsOpen] = React.useState(open);
  const onTitleClick: MouseEventHandler = (event) => {
    setIsOpen(!isOpen);
  };

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
        </div>
      </Accordion.Title>
      <Accordion.Content className="px-1 py-2">
        <div
          className={classNames(
            "flex w-full flex-wrap content-start gap-2 px-2",
          )}
        >
          <div
            className={"flex w-full items-center justify-center"}
            key={"ImportButton"}
          >
            <div
              className={
                "text-sm font-semibold text-gray-500 dark:text-gray-400"
              }
            >
              <Button
                color="purple"
                onClick={() => {
                  setShowImportModal(true);
                }}
              >
                Import Resource
              </Button>
            </div>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Panel>
  );
}
