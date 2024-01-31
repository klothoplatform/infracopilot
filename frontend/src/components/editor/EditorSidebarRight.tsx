import type { CustomFlowbiteTheme } from "flowbite-react";
import {
  Alert,
  Banner,
  Button,
  Sidebar,
  Tabs,
  type TabsRef,
  Tooltip,
  useTheme,
} from "flowbite-react";
import type { FC } from "react";
import React, { useEffect, useRef, useState } from "react";
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
import { FaArrowLeft, FaArrowRight, FaBars, FaCircle } from "react-icons/fa6";
import classNames from "classnames";
import { FaHistory } from "react-icons/fa";
import { ResizableSection } from "../Resizable";
import { TbPlugConnected } from "react-icons/tb";
import { OutlinedAlert } from "../../shared/custom-themes";
import {
  canModifyConfiguration,
  isViewMode,
  ViewMode,
} from "../../shared/EditorViewSettings";
import type { IconType } from "react-icons";
import { twMerge } from "tailwind-merge";
import type { IconBaseProps } from "react-icons/lib/esm/iconBase";

interface SidebarItemState {
  [key: string]: {
    visible: boolean | null;
    hasNotification: boolean;
  };
}

const EditorSidebarRight: FC = () => {
  const menusRef = useRef<HTMLDivElement>(null);
  const {
    selectedResource,
    selectedEdge,
    decisions,
    failures,
    rightSidebarSelector,
    navigateRightSidebar,
    viewSettings,
  } = useApplicationStore();

  const [itemState, setItemState] = useState<SidebarItemState>({});
  const [isResizable, setIsResizable] = useState(false);

  useEffect(() => {
    if (!rightSidebarSelector[0]) {
      return;
    }
    setItemState((previous) =>
      updateActiveIndex(previous, rightSidebarSelector[0] as string, true),
    );
  }, [rightSidebarSelector]);

  useEffect(() => {
    setIsResizable(Object.values(itemState).some((v) => v));
  }, [itemState]);

  const onActivate = (index: string) => {
    setItemState(updateActiveIndex(itemState, index, true, true));
    navigateRightSidebar([
      RightSidebarMenu[index as keyof typeof RightSidebarMenu],
      rightSidebarSelector[1],
    ]);
  };

  const onDeactivate = (index: string) => {
    setItemState(updateActiveIndex(itemState, index, null));
  };

  const shouldShowDetails =
    itemState[RightSidebarMenu.Details]?.visible &&
    !!(selectedResource || selectedEdge);
  const shouldShowChanges =
    itemState[RightSidebarMenu.Changes]?.visible &&
    ((decisions?.length || failures?.length) ?? 0) &&
    !isViewMode(viewSettings, ViewMode.View);
  const shouldShowMenu = shouldShowDetails || shouldShowChanges;

  const isChangesActive =
    !!itemState[RightSidebarMenu.Changes]?.visible &&
    !!(decisions?.length || failures?.length);

  const isDetailsActive =
    !!itemState[RightSidebarMenu.Details]?.visible &&
    !!(selectedResource || selectedEdge);

  const isDetailsDisabled = !selectedResource && !selectedEdge;
  const detailsHasNotification =
    !!itemState[RightSidebarMenu.Details]?.hasNotification &&
    !isDetailsDisabled;

  return (
    <>
      {shouldShowMenu && (
        <ResizableSection
          childRef={menusRef}
          handleSide="left"
          disabled={!isResizable}
        >
          <div
            ref={menusRef}
            className={classNames(
              "flex flex-col w-[600px] overflow-hidden min-w-[340px]",
              {
                hidden: Object.values(itemState).every((value) => !value),
              },
            )}
          >
            <DetailsSidebar hidden={!shouldShowDetails} />
            <ChangesSidebar hidden={!shouldShowChanges} />
          </div>
        </ResizableSection>
      )}
      <Sidebar
        collapsed
        className={"border-l-[1px] dark:border-gray-700"}
        theme={{
          root: {
            base: "h-full grow-0 shrink-0",
            inner:
              "flex justify-center h-full overflow-y-auto overflow-x-hidden bg-gray-50 py-4 dark:bg-gray-800",
            collapsed: {
              off: "",
              on: "w-12",
            },
          },
        }}
      >
        <Sidebar.Items className="h-full">
          <div className="flex h-full flex-col justify-between">
            <Sidebar.ItemGroup>
              <SidebarMenuOption
                key={RightSidebarMenu.Details}
                index={RightSidebarMenu.Details}
                label={"Details"}
                icon={FaBars}
                onActivate={onActivate}
                onDeactivate={onDeactivate}
                active={isDetailsActive}
                disabled={isDetailsDisabled}
                showNotification={detailsHasNotification}
              />
              {canModifyConfiguration(viewSettings) ? (
                <SidebarMenuOption
                  key={RightSidebarMenu.Changes}
                  index={RightSidebarMenu.Changes}
                  label={"Changes"}
                  icon={FaHistory}
                  onActivate={onActivate}
                  onDeactivate={onDeactivate}
                  active={isChangesActive}
                  disabled={decisions?.length === 0 && failures?.length === 0}
                  showNotification={
                    !!itemState[RightSidebarMenu.Changes]?.hasNotification
                  }
                />
              ) : (
                <></>
              )}
            </Sidebar.ItemGroup>
          </div>
        </Sidebar.Items>
      </Sidebar>
    </>
  );
};

function updateActiveIndex(
  mappings: SidebarItemState,
  index: number | string,
  value: boolean | null,
  force?: boolean,
): SidebarItemState {
  mappings = { ...mappings };
  let foundKey = false;
  Object.keys(mappings).forEach((key) => {
    if (key === index) {
      foundKey = true;
      const isManuallyHidden = mappings[key].visible === null;
      if (value === true && isManuallyHidden) {
        mappings[key] = {
          visible: force ? true : null,
          hasNotification: !force,
        };
      } else {
        mappings[key] = {
          visible: isManuallyHidden ? false : value,
          hasNotification: value ? false : mappings[key].hasNotification,
        };
      }
    } else {
      mappings[key] = {
        visible: mappings[key].visible === null ? null : false,
        hasNotification: mappings[key].hasNotification,
      };
    }
  });
  if (!foundKey) {
    mappings[index] = {
      visible: value,
      hasNotification: false,
    };
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
  icon?: IconType;
  active?: boolean;
  showNotification?: boolean;
}> = ({
  index,
  onActivate,
  onDeactivate,
  disabled,
  label,
  icon,
  active,
  showNotification,
}) => {
  const Icon = icon ?? (React.Fragment as any);

  const handleClick = () => {
    if (active) {
      onDeactivate?.(index);
    } else {
      onActivate?.(index);
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
            active,
        },
      )}
      icon={({ ...rest }) => (
        <SidebarIcon
          {...rest}
          disabled={disabled}
          baseIcon={Icon}
          showCircle={showNotification}
        />
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </Sidebar.Item>
  );
};

function NotificationBubble(props: { disabled: boolean | undefined }) {
  return (
    <svg
      id="svg1"
      viewBox="0 0 14 14"
      className={classNames(
        "absolute -right-1 -top-1 stroke-2 stroke-red-900 w-[14px] h-[14px]",
        {
          "[&_circle]:fill-red-600 [&_circle]:opacity-95 [&_circle]:stroke-red-700":
            !props.disabled,
          "[&_circle]:fill-gray-300 [&_circle]:stroke-gray-300 dark:[&_circle]:fill-gray-700 dark:[&_circle]:stroke-gray-700":
            props.disabled,
        },
      )}
      filter="url(#inset-shadow)"
    >
      <defs>
        <filter id="inset-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feComponentTransfer in="SourceAlpha">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="1" />
          <feOffset dx="0" dy="-2" result="offsetblur" />
          <feFlood floodColor="rgba(0, 0, 0, .2)" result="color" />
          <feComposite in2="offsetblur" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode />
          </feMerge>
        </filter>
      </defs>
      <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"></path>
      <circle cx="7" cy="7" r="6" fill="none" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

const SidebarIcon: FC<
  {
    baseIcon?: IconType;
    circleSize?: number;
    showCircle?: boolean;
    disabled?: boolean;
  } & IconBaseProps
> = ({ baseIcon, circleSize, showCircle, disabled, ...rest }) => {
  const Icon = baseIcon ?? (React.Fragment as IconType);
  return (
    <div className={"relative"}>
      <Icon
        {...rest}
        className={twMerge(rest?.className, "relative sidebar-icon-bubble")}
      />
      {showCircle && <NotificationBubble disabled={disabled} />}
    </div>
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
