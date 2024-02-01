import { type FC, useEffect, useRef, useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import {
  type NavHistoryEntry,
  RightSidebarDetailsTab,
  getNextRelevantHistoryEntry,
  getPreviousRelevantHistoryEntry,
} from "../../shared/sidebar-nav";
import classNames from "classnames";
import {
  Button,
  type CustomFlowbiteTheme,
  Tabs,
  type TabsRef,
  Tooltip,
} from "flowbite-react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { ErrorBoundary } from "react-error-boundary";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import { FallbackRenderer } from "../FallbackRenderer";
import { HiCog6Tooth } from "react-icons/hi2";
import { ResourceIdHeader } from "./ResourceIdHeader";
import ConfigForm, { type ConfigFormSection } from "./ConfigForm";
import AdditionalResources from "./AdditionalResources";
import {
  isPropertyPromoted,
  resourceProperties,
} from "../../shared/architecture/EnvironmentVersion";
import type { Property } from "../../shared/resources/ResourceTypes";
import React from "react";
import { type NodeId } from "../../shared/architecture/TopologyNode";

interface DetailsSidebarProps {
    hidden?: boolean;
  }

export  const DetailsSidebar: FC<DetailsSidebarProps> = ({
    hidden,
  }: DetailsSidebarProps) => {
    const {
      navigateBackRightSidebar,
      navigateForwardRightSidebar,
      editorSidebarState,
      rightSidebarSelector,
      selectedResource,
      environmentVersion,
    } = useApplicationStore();
  
    const [previousHistoryEntry, setPreviousHistoryEntry] = useState<
      NavHistoryEntry | undefined
    >();
    const [nextHistoryEntry, setNextHistoryEntry] = useState<
      NavHistoryEntry | undefined
    >();
  
    useEffect(() => {
      setPreviousHistoryEntry(
        getPreviousRelevantHistoryEntry(
          editorSidebarState.right.detailsTab.navHistory,
          rightSidebarSelector,
          selectedResource,
          environmentVersion,
        ),
      );
      setNextHistoryEntry(
        getNextRelevantHistoryEntry(
          editorSidebarState.right.detailsTab.navHistory,
          rightSidebarSelector,
          selectedResource,
          environmentVersion,
        ),
      );
    }, [
      rightSidebarSelector,
      selectedResource,
      environmentVersion,
      editorSidebarState.right.detailsTab.navHistory,
    ]);
  
    return (
      <div
        className={classNames("flex flex-col h-full w-full overflow-hidden", {
          hidden: hidden,
        })}
      >
        <div className="flex h-10 w-full shrink-0 grow-0 items-baseline justify-between border-b-[1px] p-2 dark:border-gray-700">
          <h2 className={"text-md font-medium dark:text-white"}>Details</h2>
          <div className="flex gap-1">
            <Tooltip
              className={classNames({
                hidden: !previousHistoryEntry,
              })}
              placement="top-start"
              animation={"duration-500"}
              content={`Click to go back to ${
                previousHistoryEntry?.resourceId?.toString() ?? ""
              }`}
            >
              <Button
                size="xs"
                color="light"
                pill
                disabled={!previousHistoryEntry}
                onClick={navigateBackRightSidebar}
              >
                <FaArrowLeft />
              </Button>
            </Tooltip>
            <Tooltip
              className={classNames({
                hidden: !nextHistoryEntry,
              })}
              placement="top-start"
              animation={"duration-500"}
              content={`Click to go forward to ${
                nextHistoryEntry?.resourceId?.toString() ?? ""
              }`}
            >
              <Button
                size="xs"
                color="light"
                pill
                disabled={!nextHistoryEntry}
                onClick={navigateForwardRightSidebar}
              >
                <FaArrowRight />
              </Button>
            </Tooltip>
          </div>
        </div>
        <ErrorBoundary
          onError={(error, info) =>
            trackError(
              new UIError({
                message: "uncaught error in EditorSidebarRight",
                errorId: "EditorSidebarRight:ErrorBoundary",
                cause: error,
                data: { info },
              }),
            )
          }
          fallbackRender={FallbackRenderer}
        >
          <div className="flex size-full min-h-0 flex-col justify-between p-2">
            <Details />
          </div>
        </ErrorBoundary>
      </div>
    );
  };
  
  const detailsTabsTheme: CustomFlowbiteTheme["tabs"] = {
    base: "flex flex-col gap-2 min-h-0 h-full",
    tablist: {
      base: "max-h-12 bg-transparent",
      tabitem: {
        styles: {
          fullWidth: {
            base: "rounded-t-lg max-h-12 focus:ring-primary-300",
            active: {
              on: "bg-primary-600 text-white dark:bg-primary-700 dark:white active:border-primary-300",
              off: "text-gray-500 hover:bg-gray-50 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300",
            },
          },
        },
      },
    },
    tabitemcontainer: {
      base: "flex flex-col min-h-0 h-full",
    },
    tabpanel: "max-h-full min-h-0 h-full",
  };

const Details: FC = function () {
  const tabsRef = useRef<TabsRef>(null);
  const {
    rightSidebarSelector,
    navigateRightSidebar,
    selectedResource,
    selectedEdge,
    resourceTypeKB,
    environmentVersion,
  } = useApplicationStore();

  const [sections, setSections] = React.useState<
    ConfigFormSection[] | undefined
  >();
  const [formResource, setFormResource] = React.useState<NodeId | undefined>();

  useEffect(() => {
    if (selectedResource) {
      const allProperties = resourceProperties(
        environmentVersion,
        resourceTypeKB,
        selectedResource,
      );
      const promotedProperties = new Map<string, Property[]>();
      for (const [resourceId, properties] of allProperties) {
        const metadata = environmentVersion.resources.get(
          selectedResource.toString(),
        );
        let promotedProps = properties.filter((p) => isPropertyPromoted(p));
        if (metadata?.imported) {
          promotedProps = properties.filter((p) => !p.hidden);
        }
        if (promotedProps.length > 0) {
          promotedProperties.set(resourceId.toString(), promotedProps);
        }
      }
      let remainingProperties = allProperties
        .get(selectedResource)
        ?.filter(
          (p) =>
            !promotedProperties?.get(selectedResource.toString())?.includes(p),
        );
      if (promotedProperties.size === 0) {
        promotedProperties.set(
          selectedResource.toString(),
          remainingProperties ?? [],
        );
        remainingProperties = undefined;
      }
      if (remainingProperties?.length === 0) {
        remainingProperties = undefined;
      }
      const newSections = []
  
      if (promotedProperties) {
        newSections.push({
          title: "properties",
          propertyMap: promotedProperties,
        });
      }
      if (remainingProperties && selectedResource) {
        newSections.push({
          title: "more properties",
          defaultOpened: false,
          propertyMap: new Map([
            [selectedResource.toString(), remainingProperties],
          ]),
        });
      }
      setSections(newSections);
      setFormResource(selectedResource);
    } 
  }, [selectedResource, environmentVersion, resourceTypeKB]);

  useEffect(() => {
    tabsRef.current?.setActiveTab(rightSidebarSelector[1]);
  }, [rightSidebarSelector]);



  console.log("DetailsSidebarProps: ", selectedResource, sections);

  return (
    <Tabs
      theme={detailsTabsTheme}
      aria-label="Architecture Actions"
      /* eslint-disable-next-line react/style-prop-object */
      style={"fullWidth"}
      ref={tabsRef}
      onActiveTabChange={(tab) => {
        if (tab === rightSidebarSelector[1]) {
          return;
        }
        navigateRightSidebar([
          rightSidebarSelector[0],
          RightSidebarDetailsTab[
            RightSidebarDetailsTab[tab] as keyof typeof RightSidebarDetailsTab
          ],
        ]);
      }}
    >
      <Tabs.Item
        className="col flex h-full min-h-0"
        active
        title="Config"
        icon={HiCog6Tooth}
      >
        <div className="flex h-full min-h-0 flex-col">
          <ResourceIdHeader
            resourceId={formResource}
            edgeId={selectedEdge}
          />
          {selectedResource && formResource == selectedResource && (
            <ConfigForm
              key={`config-table-${selectedResource.toString()}`}
              sections={sections}
              showCustomConfig={true}
            />
          )}
        </div>
      </Tabs.Item>
      <Tabs.Item title="Additional Resources">
        <ResourceIdHeader resourceId={selectedResource} edgeId={selectedEdge} />
        <AdditionalResources />
      </Tabs.Item>
    </Tabs>
  );
};
