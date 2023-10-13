import type { FC, PropsWithChildren } from "react";
import React, { useCallback } from "react";
import { Accordion, Button } from "flowbite-react";
import { HiMinusCircle } from "react-icons/hi";
import { useFormContext } from "react-hook-form";

type ConfigSectionProps = {
  id: string;
  title?: string;
  removable?: boolean;
};

export const ConfigSection: FC<PropsWithChildren<ConfigSectionProps>> = ({
  id,
  title,
  removable,
  children,
}) => {
  const { unregister, getValues } = useFormContext();

  const remove = useCallback(() => {
    const values = getValues(id);
    unregister(getKeys(values, id));
    console.log(values);
    console.log(getKeys(values, id));
  }, [getValues, unregister]);

  return (
    <Accordion>
      <Accordion.Panel isOpen>
        <Accordion.Title className={"text-sm"}>
          <div className={"flex flex-row justify-between"}>
            <div>{title ?? id}</div>
          </div>
        </Accordion.Title>
        <>
          {removable && (
            <Button size={"xs"} color={"purple"}>
              <HiMinusCircle onClick={remove} />
            </Button>
          )}
        </>
        <Accordion.Content className={"px-0"}>{children}</Accordion.Content>
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
