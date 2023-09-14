import classNames from "classnames";
import type { CustomFlowbiteTheme } from "flowbite-react";
import { Accordion, Sidebar, TextInput } from "flowbite-react";
import type { ChangeEvent, FC, ForwardedRef } from "react";
import React, { forwardRef, useCallback, useState } from "react";
import { HiFilter } from "react-icons/hi";

import { useSidebarContext } from "../context/SidebarContext";
import type { FilterFunction } from "./ResourceAccordion";
import ResourceAccordion from "./ResourceAccordion";
import { AwsLogo, Docker } from "./Icon";
import { Logo } from "./icons/K8SLogo/Unlabeled";
import debounce from "lodash.debounce";

const sidebarTheme: CustomFlowbiteTheme["sidebar"] = {
  root: {
    // base: "h-full flex overflow-x-hidden overflow-y-auto",
    // inner:
    //   "h-full w-full overflow-y-auto overflow-x-hidden rounded bg-gray-50 py-4 px-3 dark:bg-gray-800",
  },
};

const EditorSidebarLeft = forwardRef(
  (props, ref: ForwardedRef<HTMLDivElement>) => {
    const { isOpenOnSmallScreens: isSidebarOpenOnSmallScreens } =
      useSidebarContext();

    const [filterFunction, setFilterFunction] = useState<
      FilterFunction | undefined
    >(undefined);

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
      setFilterFunction((prevState: FilterFunction | undefined) => {
        const filterValue = event.target.value;
        return filterValue
          ? (type: string) => {
              return filterValue
                ? type
                    .toLowerCase()
                    .replaceAll(/[-_]/g, "")
                    .includes(
                      filterValue.toLowerCase().replaceAll(/[-_ ]/g, ""),
                    )
                : true;
            }
          : undefined;
      });
    };

    const debouncedHandleInputChange = useCallback(
      debounce(handleInputChange, 200),
      [],
    );

    return (
      <div
        ref={ref}
        className={classNames("flex w-full", {
          hidden: isSidebarOpenOnSmallScreens,
        })}
      >
        <Sidebar
          aria-label="Sidebar"
          collapsed={false}
          className={"w-full min-w-fit"}
          theme={sidebarTheme}
        >
          <div className="flex flex-col justify-between gap-2 py-2">
            <TextInput
              icon={HiFilter}
              type="search"
              placeholder="filter"
              required
              size={32}
              onChange={debouncedHandleInputChange}
            />
            <div className={"w-full"}>
              <Accordion>
                <ResourceAccordion
                  name={"AWS"}
                  icon={<AwsLogo width={"20px"} height={"20px"} />}
                  open
                  filter={filterFunction}
                />
                <ResourceAccordion
                  name={"Kubernetes"}
                  icon={<Logo width={"20px"} height={"20px"} />}
                  filter={filterFunction}
                />
                <ResourceAccordion
                  name={"Docker"}
                  icon={<Docker width={"20px"} height={"20px"} />}
                  filter={filterFunction}
                />
              </Accordion>
            </div>
          </div>
        </Sidebar>
      </div>
    );
  },
);
EditorSidebarLeft.displayName = "EditorSidebarLeft";

export default EditorSidebarLeft;
