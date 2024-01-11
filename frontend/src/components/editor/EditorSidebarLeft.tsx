import classNames from "classnames";
import { Accordion, Button, Sidebar, TextInput } from "flowbite-react";
import type { ChangeEvent, ForwardedRef } from "react";
import React, { forwardRef, useCallback, useState } from "react";
import { HiSearch } from "react-icons/hi";

import { useSidebarContext } from "../../context/SidebarContext";
import type { FilterFunction } from "./ResourceAccordion";
import ResourceAccordion from "./ResourceAccordion";
import debounce from "lodash.debounce";
import { ViewNodeType } from "../../shared/architecture/Architecture";
import { FallbackRenderer } from "../FallbackRenderer";
import { ErrorBoundary } from "react-error-boundary";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { env } from "../../shared/environment";
import ImportResourceModal from "../imports/ImportResourceModal";
import ImportAccordion from "../imports/ImportAccordian";

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

type EditorSidebarLeftProps = {
  resourceLayout?: "list" | "grid";
};

const EditorSidebarLeft = forwardRef(
  (
    { resourceLayout }: EditorSidebarLeftProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    const {
      getResourceTypeKB,
      environmentVersion: { architecture_id, id },
    } = useApplicationStore();

    const { isOpenOnSmallScreens: isSidebarOpenOnSmallScreens } =
      useSidebarContext();

    const [filterFunction, setFilterFunction] = useState<
      FilterFunction | undefined
    >(undefined);

    const [showImportModal, setShowImportModal] = useState(false);


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
      debounce(handleInputChange, 100),
      [],
    );

    let sections = [(
      <ImportAccordion
        key={"ImportAccordion"}
        name={"Import"}
        setShowImportModal={setShowImportModal}
      />
    )]

    const resourceSections = displayedClassifications.map((classification, index) => {
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
            excludedQualifiedTypes: env.hiddenResources,
          }}
          userFilter={filterFunction}
          layout={resourceLayout}
          open
        />
      );
    });

    resourceSections.forEach((section) => {
      sections.push(section);
    })

    return (
      <div
        ref={ref}
        className={classNames("flex w-full", {
          hidden: isSidebarOpenOnSmallScreens,
        })}
      >
        {showImportModal && (
          <ImportResourceModal onClose={() => setShowImportModal(false)} />
        )}
        <Sidebar
          aria-label="Sidebar"
          collapsed={false}
          className={"w-full min-w-fit"}
        >
          <ErrorBoundary
            onError={(error, info) =>
              trackError(
                new UIError({
                  message: "uncaught error in EditorSidebarLeft",
                  errorId: "EditorSidebarLeft:ErrorBoundary",
                  cause: error,
                  data: { info },
                }),
              )
            }
            fallbackRender={FallbackRenderer}
            onReset={() => {
              getResourceTypeKB(architecture_id, id, true);
            }}
          >
            <div className="flex flex-col justify-between gap-2 py-2">
              <TextInput
                icon={HiSearch}
                type="search"
                placeholder="Search for a resource"
                required
                size={32}
                onChange={debouncedHandleInputChange}
              />
              <div className={"w-full"}>
                <Accordion>{sections}</Accordion>
              </div>
            </div>
          </ErrorBoundary>
        </Sidebar>
      </div>
    );
  },
);
EditorSidebarLeft.displayName = "EditorSidebarLeft";

export default EditorSidebarLeft;
