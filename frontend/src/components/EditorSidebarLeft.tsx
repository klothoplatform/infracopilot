import classNames from "classnames";
import { Sidebar, TextInput } from "flowbite-react";
import type { FC } from "react";
import React, { useEffect, useState } from "react";
import { HiSearch } from "react-icons/hi";

import { useSidebarContext } from "../context/SidebarContext";
import ResourceAccordion from "./ResourceAccordion";
import { AwsLogo, Docker } from "./Icon";
import { Logo } from "./icons/K8SLogo/Unlabeled";

const EditorSidebarLeft: FC = function () {
  const { isOpenOnSmallScreens: isSidebarOpenOnSmallScreens } =
    useSidebarContext();

  return (
    <div
      className={classNames("lg:!block left-0 basis-2/12", {
        hidden: !isSidebarOpenOnSmallScreens,
      })}
    >
      <Sidebar aria-label="Sidebar" collapsed={false} className={"w-fit"}>
        <div className="flex max-h-[calc(100vh-6rem)] flex-col justify-between py-2">
          <div>
            <form className="pb-3">
              <TextInput
                icon={HiSearch}
                type="search"
                placeholder="Search"
                required
                size={32}
              />
            </form>
          </div>
          <ResourceAccordions />
        </div>
      </Sidebar>
    </div>
  );
};

const ResourceAccordions: FC = function () {
  return (
    <div className={"w-full"}>
      <ResourceAccordion
        name={"AWS"}
        icon={<AwsLogo width={"20px"} height={"20px"} />}
        open
      />
      <ResourceAccordion
        name={"Kubernetes"}
        icon={<Logo width={"20px"} height={"20px"} />}
      />
      <ResourceAccordion
        name={"Docker"}
        icon={<Docker width={"20px"} height={"20px"} />}
      />
    </div>
  );
};

export default EditorSidebarLeft;
