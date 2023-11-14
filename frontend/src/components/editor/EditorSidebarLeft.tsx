import classNames from "classnames";
import type { CustomFlowbiteTheme } from "flowbite-react";
import { Accordion, Sidebar, TextInput } from "flowbite-react";
import type { ChangeEvent, ForwardedRef } from "react";
import React, { forwardRef, useCallback, useState } from "react";
import { HiFilter } from "react-icons/hi";

import { useSidebarContext } from "../../context/SidebarContext";
import type { FilterFunction } from "./ResourceAccordion";
import ResourceAccordion from "./ResourceAccordion";
import debounce from "lodash.debounce";
import { ViewNodeType } from "../../shared/architecture/Architecture";

const displayedClassifications = [
  "api",
  "cluster",
  "compute",
  "load_balancer",
  "messaging",
  "network",
  "queue",
  "storage",
];

const sidebarTheme: CustomFlowbiteTheme["sidebar"] = {
  root: {
    // base: "h-full flex overflow-x-hidden overflow-y-auto",
    // inner:
    //   "h-full w-full overflow-y-auto overflow-x-hidden rounded bg-gray-50 py-4 px-3 dark:bg-gray-800",
  },
};

type EditorSidebarLeftProps = {
  resourceLayout?: "list" | "grid";
};

const EditorSidebarLeft = forwardRef(
  (
    { resourceLayout }: EditorSidebarLeftProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
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

    const sections = displayedClassifications.map((classification, index) => {
      let name = classification
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (s) => s.toUpperCase());
      // hack
      if (name === "Api") {
        name = "API";
      }
      return (
        <ResourceAccordion
          key={index}
          name={name}
          resourceFilter={{
            classifications: [classification],
            iconSizes: [ViewNodeType.Parent, ViewNodeType.Big],
          }}
          userFilter={filterFunction}
          layout={resourceLayout}
          open
        />
      );
    });

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
              <Accordion>{sections}</Accordion>
            </div>
          </div>
        </Sidebar>
      </div>
    );
  },
);
EditorSidebarLeft.displayName = "EditorSidebarLeft";

export default EditorSidebarLeft;
