import type { FC, PropsWithChildren } from "react";
import React, { Fragment, useCallback } from "react";
import { Accordion, Button } from "flowbite-react";
import { HiMinusCircle } from "react-icons/hi";
import { useFormContext } from "react-hook-form";
import { BiChevronRight } from "react-icons/bi";

type ConfigSectionProps = {
  id: string;
  title?: string;
  removable?: boolean;
  defaultOpened?: boolean;
  alwaysOpen?: boolean;
};

export const ConfigSection: FC<PropsWithChildren<ConfigSectionProps>> = ({
  id,
  title,
  removable,
  children,
  defaultOpened,
}) => {
  const { unregister, getValues } = useFormContext();

  const remove = useCallback(() => {
    const values = getValues(id);
    unregister(getKeys(values, id));
    console.log(values);
    console.log(getKeys(values, id));
  }, [getValues, id, unregister]);

  return (
    <Accordion collapseAll={!(defaultOpened ?? true)}>
      <Accordion.Panel isOpen>
        <Accordion.Title
          title={title}
          className={
            "px-2 py-1 text-sm [&>h2]:overflow-hidden [&>h2]:text-ellipsis"
          }
        >
          <>
            <div
              className={
                "flex w-full flex-wrap items-center [&>span:first-child]:hidden"
              }
            >
              {(title ?? id).split(".").map((part, index) => {
                return (
                  <Fragment key={index}>
                    <span className="px-1">
                      <BiChevronRight />
                    </span>
                    <span
                      className={"w-fit overflow-hidden text-ellipsis "}
                      key={index}
                    >
                      {part}
                    </span>
                  </Fragment>
                );
              })}
            </div>
          </>
        </Accordion.Title>
        <>
          {removable && (
            <Button size={"xs"} color={"purple"}>
              <HiMinusCircle onClick={remove} />
            </Button>
          )}
        </>
        <Accordion.Content className={"p-2 [&>*:not(:last-child)]:mb-2"}>
          {children}
        </Accordion.Content>
      </Accordion.Panel>
    </Accordion>
  );
};

function getKeys(obj: any, parent?: string): string[] {
  const keys = [];
  for (const key in obj) {
    if (Array.isArray(obj)) {
      keys.push(
        ...getKeys(key).map((k) => `${parent ? parent + "." : ""}${k}`),
      );
    }
    if (typeof obj[key] === "object") {
      keys.push(
        ...getKeys(obj[key], key).map(
          (k) => `${parent ? parent + "." : ""}${k}`,
        ),
      );
    }
    keys.push(`${parent ? parent + "." : ""}${key}`);
  }
  return keys;
}
