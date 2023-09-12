import classNames from "classnames";
import { Accordion, Sidebar, TextInput } from "flowbite-react";
import type { ChangeEvent, FC } from "react";
import React, { useEffect, useState } from "react";
import { HiFilter } from "react-icons/hi";

import { useSidebarContext } from "../context/SidebarContext";
import type { FilterFunction } from "./ResourceAccordion";
import ResourceAccordion from "./ResourceAccordion";
import { AwsLogo, Docker } from "./Icon";
import { Logo } from "./icons/K8SLogo/Unlabeled";
import { useAuth0 } from "@auth0/auth0-react";

const EditorSidebarLeft: FC = function () {
  const { isOpenOnSmallScreens: isSidebarOpenOnSmallScreens } =
    useSidebarContext();

  const [filterValue, setFilterValue] = useState("");
  const [filterFunction, setFilterFunction] = useState<
    FilterFunction | undefined
  >(undefined);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilterValue(event.target.value);
  };

  useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setFilterFunction((prevState: FilterFunction | undefined) => {
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
    }, 200);
    return () => clearTimeout(delayInputTimeoutId);
  }, [filterValue]);

  return (
    <div
      className={classNames("lg:!block left-0 basis-2/12", {
        hidden: !isSidebarOpenOnSmallScreens,
      })}
    >
      <Sidebar aria-label="Sidebar" collapsed={false} className={"w-fit"}>
        <div className="flex max-h-[calc(100vh-6rem)] flex-col justify-between py-2">
          <div>
            <TextInput
              icon={HiFilter}
              type="search"
              placeholder="filter"
              required
              size={32}
              onChange={handleInputChange}
            />
          </div>
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
};

export default EditorSidebarLeft;
