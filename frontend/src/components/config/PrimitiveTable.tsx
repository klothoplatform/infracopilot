import type { FC } from "react";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { findChildProperty } from "./ConfigField";
import classNames from "classnames";
import { Button, TextInput } from "flowbite-react";
import { HiMinusCircle, HiPlusCircle } from "react-icons/hi";

type PrimitiveMapProps = {
  id: string;
  disabled?: boolean;
  properties: string[];
};

export const PrimitiveTable: FC<PrimitiveMapProps> = ({
  id,
  disabled,
  properties,
}) => {
  const { register, control, formState } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: id,
  });
  const { errors } = formState;
  const error = findChildProperty(errors, id);
  const errorMessage =
    error?.type === "manual" ? error.message : error?.root?.message;

  return (
    <div
      className={classNames("flex w-full flex-col gap-1", {
        "p-2.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500":
          error?.root || error?.type === "manual",
        "ml-1": !error?.root && error?.type !== "manual",
      })}
    >
      {fields.map((field, index) => {
        return (
          <div key={field.id} className="my-[.1rem] flex w-full gap-1">
            <div className="flex w-full gap-1">
              {properties.map((property) => {
                return (
                  <div key={property} className={"flex w-full flex-col"}>
                    {index === 0 && (
                      <label
                        className={classNames(
                          "mt-2 text-sm font-medium w-full overflow-hidden text-ellipsis",
                          {
                            "dark:text-white":
                              !error?.root && error?.type !== "manual",
                            "text-red-700 dark:text-red-500":
                              error?.root || error?.type === "manual",
                          },
                        )}
                      >
                        {property}
                      </label>
                    )}
                    <TextInput
                      sizing={"sm"}
                      id={`${id}[${index}].${property}`}
                      disabled={disabled}
                      {...register(`${id}[${index}].${property}`)}
                    />
                  </div>
                );
              })}
            </div>
            {!disabled && (
              <Button
                theme={{
                  size: {
                    md: "text-sm py-2",
                  },
                }}
                className={"mt-auto w-8 min-w-6 grow-0"}
                color={"red"}
                size={"md"}
                onClick={() => {
                  remove(index);
                }}
              >
                <HiMinusCircle />
              </Button>
            )}
          </div>
        );
      })}
      {!disabled && (
        <Button
          size={"sm"}
          className={"mt-1 w-fit"}
          color="purple"
          onClick={() => {
            append({ key: "", value: "" });
          }}
        >
          <HiPlusCircle />
        </Button>
      )}
      {(!!error?.root || error?.type === "manual") && (
        <p className="mt-2 overflow-auto text-sm text-red-600 dark:text-red-500">
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};
