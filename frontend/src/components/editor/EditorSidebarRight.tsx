import type { CustomFlowbiteTheme } from "flowbite-react";
import {
  Alert,
  Button,
  Sidebar,
  Tabs,
  type TabsRef,
  Tooltip,
  useTheme,
  Banner,
} from "flowbite-react";
import type { ComponentProps, FC, ForwardedRef, ReactElement } from "react";
import React, {
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  HiCheck,
  HiCheckCircle,
  HiExclamation,
  HiInformationCircle,
  HiOutlineClipboardCopy,
  HiXCircle,
} from "react-icons/hi";
import { HiCog6Tooth } from "react-icons/hi2";
import ConfigForm from "./ConfigForm";
import AdditionalResources from "./AdditionalResources";
import useApplicationStore from "../../pages/store/ApplicationStore";
import type { NavHistoryEntry } from "../../shared/sidebar-nav";
import {
  getNextRelevantHistoryEntry,
  getPreviousRelevantHistoryEntry,
  RightSidebarDetailsTab,
  RightSidebarMenu,
} from "../../shared/sidebar-nav";
import type { NodeId } from "../../shared/architecture/TopologyNode";
import { NodeIcon } from "../../shared/resources/ResourceMappings";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../FallbackRenderer";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBars,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa6";
import classNames from "classnames";
import { FaHistory } from "react-icons/fa";
import { ResizableSection } from "../Resizable";
import { TbPlugConnected } from "react-icons/tb";
import { MdAnnouncement } from "react-icons/md";
import { OutlinedAlert } from "../../shared/custom-themes";

const EditorSidebarRight = forwardRef(
  (props, ref: ForwardedRef<HTMLDivElement>) => {
    const menusRef = useRef<HTMLDivElement>(null);
    const [outerIsCollapsed, setOuterIsCollapsed] = useState(true);
    const {
      selectedResource,
      selectedEdge,
      decisions,
      failures,
      rightSidebarSelector,
      navigateRightSidebar,
    } = useApplicationStore();

    const [tabState, setTabState] = useState<{
      [key: string]: boolean;
    }>({});

    const [isResizable, setIsResizable] = useState(false);

    useEffect(() => {
      if (!rightSidebarSelector[0]) {
        return;
      }
      setTabState((previous) =>
        updateActiveIndex(previous, rightSidebarSelector[0] as string, true),
      );
    }, [rightSidebarSelector]);

    useEffect(() => {
      setIsResizable(Object.values(tabState).some((v) => v));
    }, [tabState]);

    const onActivate = (index: string) => {
      setTabState(updateActiveIndex(tabState, index, true));
      navigateRightSidebar([
        RightSidebarMenu[index as keyof typeof RightSidebarMenu],
        rightSidebarSelector[1],
      ]);
    };

    const onDeactivate = (index: string) => {
      setTabState(updateActiveIndex(tabState, index, false));
    };

    return (
      <>
        <ResizableSection
          childRef={menusRef}
          handleSide="left"
          disabled={!isResizable}
        >
          <div
            ref={menusRef}
            className={classNames(
              "flex flex-col w-[600px] overflow-hidden min-w-[300px]",
              {
                hidden: Object.values(tabState).every((value) => !value),
              },
            )}
          >
            <DetailsSidebar
              hidden={
                !tabState[RightSidebarMenu.Details] ||
                rightSidebarSelector[0] !== RightSidebarMenu.Details
              }
            />
            <ChangesSidebar
              hidden={
                !tabState[RightSidebarMenu.Changes] ||
                rightSidebarSelector[0] !== RightSidebarMenu.Changes
              }
            />
          </div>
        </ResizableSection>
        <Sidebar
          collapsed={outerIsCollapsed}
          className={"border-l-[1px] dark:border-gray-700"}
          theme={{
            root: {
              base: "h-full grow-0 shrink-0",
              inner:
                "h-full overflow-y-auto overflow-x-hidden bg-gray-50 py-4 px-3 dark:bg-gray-800",
              collapsed: {
                off: "",
              },
            },
          }}
        >
          <Sidebar.Items className="h-full">
            <div className="flex h-full flex-col justify-between">
              <Sidebar.ItemGroup>
                <SidebarMenuOptionGroup activeIndex={rightSidebarSelector[0]}>
                  <SidebarMenuOption
                    key={RightSidebarMenu.Details}
                    index={RightSidebarMenu.Details}
                    label={"Details"}
                    icon={FaBars}
                    onActivate={onActivate}
                    onDeactivate={onDeactivate}
                    active={
                      tabState[RightSidebarMenu.Details] &&
                      !!(selectedResource || selectedEdge)
                    }
                    disabled={!selectedResource && !selectedEdge}
                  />
                  <SidebarMenuOption
                    key={RightSidebarMenu.Changes}
                    index={RightSidebarMenu.Changes}
                    label={"Changes"}
                    icon={FaHistory}
                    onActivate={onActivate}
                    onDeactivate={onDeactivate}
                    active={
                      tabState[RightSidebarMenu.Changes] &&
                      !!(decisions?.length || failures?.length)
                    }
                    disabled={decisions?.length === 0 && failures?.length === 0}
                  />
                </SidebarMenuOptionGroup>
              </Sidebar.ItemGroup>
            </div>
          </Sidebar.Items>
        </Sidebar>
      </>
    );
  },
);

EditorSidebarRight.displayName = "EditorSidebarRight";

const SidebarMenuOptionGroup: FC<{
  activeIndex: string | undefined;
  children: ReactElement<typeof SidebarMenuOption>[];
}> = ({ activeIndex, children }) => {
  const [active, setActive] = useState<string | undefined>(activeIndex);

  useEffect(() => {
    setActive(activeIndex);
  }, [activeIndex]);

  return (
    <SidebarOptionsContext.Provider
      value={{
        activeIndex: active,
        setActiveIndex: setActive,
      }}
    >
      {children}
    </SidebarOptionsContext.Provider>
  );
};

const SidebarOptionsContext = React.createContext<{
  activeIndex?: string;
  setActiveIndex: (index?: string) => void;
}>({
  activeIndex: undefined,
  setActiveIndex: () => {},
});

function updateActiveIndex(
  mappings: {
    [key: string]: boolean;
  },
  index: number | string,
  value?: boolean,
): {
  [key: string]: boolean;
} {
  mappings = { ...mappings };
  let foundKey = false;
  Object.keys(mappings).forEach((key) => {
    if (key === index) {
      foundKey = true;
      mappings[key] = value !== undefined ? value : !mappings[key];
    } else {
      mappings[key] = false;
    }
  });
  if (!foundKey) {
    mappings[index] = value !== undefined ? value : true;
  }
  return mappings;
}

const SidebarMenuOption: FC<{
  index: string;
  onActivate?: (index: string) => void;
  onDeactivate?: (index: string) => void;
  disabled?: boolean;
  hidden?: boolean;
  label?: string;
  icon?: FC<ComponentProps<"svg">>;
  active?: boolean;
}> = ({ index, onActivate, onDeactivate, disabled, label, icon, active }) => {
  const [isActive, setIsActive] = useState(active && !disabled);
  const { activeIndex, setActiveIndex } = useContext(SidebarOptionsContext);

  useEffect(() => {
    const shouldBeActive = activeIndex === index && !disabled;

    if (shouldBeActive && !isActive) {
      setIsActive(true);
      console.debug("activating", index);
      onActivate?.(index);
    } else if (!shouldBeActive && isActive) {
      setIsActive(false);
      console.debug("deactivating", index);
      onDeactivate?.(index);
    }
  }, [activeIndex, index]);

  const handleClick = () => {
    if (isActive) {
      setActiveIndex(undefined);
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <Sidebar.Item
      key={index}
      as={"button"}
      className={classNames(
        "w-fit cursor-default disabled:hover:bg-gray-50 disabled:text-gray-300 [&_svg]:disabled:fill-gray-300 [&_svg]:dark:disabled:fill-gray-600 dark:disabled:hover:bg-gray-800 disabled:cursor-not-allowed dark:disabled:text-gray-600",
        {
          "dark:hover:bg-primary-600 hover:bg-primary-600 bg-primary-600 [&_svg]:fill-white text-white":
            isActive,
        },
      )}
      icon={icon}
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </Sidebar.Item>
  );
};

const ChangesSidebar: FC<{
  hidden?: boolean;
}> = ({ hidden }) => {
  const { decisions, failures } = useApplicationStore();

  let notifications = [] as EventProps[];
  if (failures?.length) {
    for (const failure of failures) {
      if (failure.cause.length > 0) {
        notifications.push({
          type: "failure",
          title: failure.formatTitle(),
          details: failure.formatInfo(),
        });
      }
    }
  }
  decisions?.forEach((decision) => {
    notifications.push({
      type: "success",
      title: decision.formatTitle(),
      details: decision.formatInfo(),
    });
  });

  return (
    <div
      className={classNames("flex flex-col h-full w-full", {
        hidden: hidden,
      })}
    >
      <div className="flex h-10 w-full items-baseline justify-between border-b-[1px] p-2 dark:border-gray-700">
        <h2 className={"text-md font-medium dark:text-white"}>Changes</h2>
      </div>
      <ErrorBoundary
        onError={(error, info) =>
          trackError(
            new UIError({
              message: "uncaught error in EditorSidebarRight",
              errorId: "EditorSidebarLeft:ErrorBoundary",
              cause: error,
              data: { info },
            }),
          )
        }
        fallbackRender={FallbackRenderer}
      >
        <div className="flex h-full flex-col justify-between overflow-y-auto px-2 py-4">
          <EventNotifications events={notifications} />
        </div>
      </ErrorBoundary>
    </div>
  );
};

interface DetailsSidebarProps {
  hidden?: boolean;
}

const DetailsSidebar: FC<DetailsSidebarProps> = ({
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
        <div className="flex h-full min-h-0 w-full flex-col justify-between p-2">
          <Details />
        </div>
      </ErrorBoundary>
    </div>
  );
};

const detailsTabsTheme: CustomFlowbiteTheme["tab"] = {
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
  } = useApplicationStore();

  useEffect(() => {
    tabsRef.current?.setActiveTab(rightSidebarSelector[1]);
  }, [rightSidebarSelector]);

  return (
    <Tabs.Group
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
            resourceId={selectedResource}
            edgeId={selectedEdge}
          />
          {selectedResource && (
            <ConfigForm key={`config-table-${selectedResource.toString()}`} />
          )}
        </div>
      </Tabs.Item>
      <Tabs.Item title="Additional Resources">
        <ResourceIdHeader resourceId={selectedResource} edgeId={selectedEdge} />
        <AdditionalResources />
      </Tabs.Item>
    </Tabs.Group>
  );
};

type ResourceIdHeaderProps = {
  resourceId?: NodeId;
  edgeId?: string;
};

const ResourceIdHeader: FC<ResourceIdHeaderProps> = function ({
  resourceId,
  edgeId,
}) {
  const { mode } = useTheme();

  const [copied, setCopied] = useState(false);

  const { environmentVersion, selectedResource } = useApplicationStore();
  let resourceMetadata;
  if (selectedResource) {
    resourceMetadata = environmentVersion?.resources.get(
      selectedResource.toString(),
    );
  }

  const onClickCopyButton = async (e: any) => {
    e.target.blur();
    await navigator.clipboard.writeText(
      resourceId?.toString() ?? edgeId?.toString() ?? "",
    );
    setCopied(true);
    e.target.disabled = true;
    setTimeout(() => {
      e.target.disabled = false;
      setCopied(false);
    }, 3000);
  };

  const itemType = resourceId?.qualifiedType ?? "connection";
  const itemName = resourceId
    ? `${resourceId.namespace ? resourceId.namespace + ":" : ""}${
        resourceId.name
      }`
    : edgeId;

  return (
    <>
      {(resourceId || edgeId) && (
        <div className="border-b-2 border-gray-200 pb-1 dark:border-gray-700">
          <div className={"mb-2 flex flex-row items-center gap-2"}>
            {resourceId ? (
              <NodeIcon
                provider={resourceId?.provider ?? "unknown"}
                type={resourceId?.type ?? "unknown"}
                style={{ maxHeight: "50px", maxWidth: "50px" }}
                variant={mode}
              />
            ) : (
              <TbPlugConnected
                className="stroke-gray-700 dark:stroke-gray-300"
                size={50}
              />
            )}
            <div className="inline-block w-full overflow-hidden align-middle">
              <div
                className="overflow-hidden text-ellipsis text-xs font-medium text-gray-500 dark:text-gray-400"
                title={itemType}
              >
                {itemType}
              </div>
              <div
                className={
                  "text-md overflow-hidden text-ellipsis font-semibold dark:text-white"
                }
                title={itemName}
              >
                {itemName}
                <div />
              </div>
            </div>
            <Button
              color="gray"
              className="h-14 w-10 focus:ring-0"
              onClick={onClickCopyButton}
              disabled={resourceId === undefined}
            >
              {!copied && (
                <HiOutlineClipboardCopy className="stroke-gray-700 dark:stroke-gray-300" />
              )}
              {copied && <HiCheck color="green" />}
            </Button>
          </div>
          {resourceMetadata?.imported && (
            <Banner>
              <div className="flex w-full justify-between border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
                <div className="mx-auto flex items-center">
                  <p className="flex items-center text-sm font-normal text-gray-500 dark:text-gray-400">
                    <HiInformationCircle className="mr-4 h-4 w-4" />
                    <span className="[&_p]:inline">
                      This resource is imported and configured externally
                    </span>
                  </p>
                </div>
              </div>
            </Banner>
          )}
        </div>
      )}
    </>
  );
};

export interface EventProps {
  type: "success" | "failure" | "warning" | "info";
  title: string;
  details?: string;
}

const eventIconMap = {
  success: HiCheckCircle,
  failure: HiXCircle,
  warning: HiExclamation,
  info: HiInformationCircle,
};

const EventNotification: FC<EventProps> = function ({ type, title, details }) {
  return (
    <div className="flex flex-col">
      <Alert
        theme={OutlinedAlert}
        color={type}
        icon={eventIconMap[type]}
        title={title}
      >
        <div className="text-ellipsis">{title}</div>
      </Alert>

      {details && (
        <div className="mx-2 break-all border-[1px] border-t-0 border-gray-300 bg-white py-2 pl-4 pr-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          {details.split(/\n/).map((line, index) => (
            <React.Fragment key={index}>
              {line}
              <br />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

interface EventNotificationsProps {
  events: EventProps[];
}

const EventNotifications: FC<EventNotificationsProps> = function ({ events }) {
  return (
    <div className="flex max-h-full flex-col space-y-4">
      {events.map((event, index) => (
        <EventNotification key={index} {...event} />
      ))}
    </div>
  );
};

export default EditorSidebarRight;
