import type { CustomFlowbiteTheme } from "flowbite-react";
import {
  Alert,
  Sidebar,
  Tabs,
  type TabsRef,
  Tooltip,
  useThemeMode,
} from "flowbite-react";
import type { FC } from "react";
import React, { useEffect, useRef, useState } from "react";
import {
  HiCheckCircle,
  HiExclamation,
  HiInformationCircle,
  HiXCircle,
} from "react-icons/hi";
import useApplicationStore from "../../pages/store/ApplicationStore";
import {
  RightSidebarMenu,
} from "../../shared/sidebar-nav";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../FallbackRenderer";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import { FaArrowLeft, FaArrowRight, FaBars } from "react-icons/fa6";
import classNames from "classnames";
import { FaHistory } from "react-icons/fa";
import { ResizableSection } from "../Resizable";
import { OutlinedAlert } from "../../shared/custom-themes";
import {
  canModifyConfiguration,
  isViewMode,
  ViewMode,
} from "../../shared/EditorViewSettings";
import type { IconBaseProps, IconType } from "react-icons";
import { twMerge } from "tailwind-merge";
import { MdNotificationImportant } from "react-icons/md";
import { ModifiedConfigSidebar } from "./ModifiedConfigSidebar";
import { DetailsSidebar } from "./DetailsSidebar";

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

  const [warnMissingProperties, setWarnMissingProperties] = useState<boolean>(false);

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
  const shouldShowMissingConfig = itemState[RightSidebarMenu.MissingConfig]?.visible
  const shouldShowMenu = shouldShowDetails || shouldShowChanges || shouldShowMissingConfig;

  const isChangesActive =
    !!itemState[RightSidebarMenu.Changes]?.visible &&
    !!(decisions?.length || failures?.length);

  const isDetailsActive =
    !!itemState[RightSidebarMenu.Details]?.visible &&
    !!(selectedResource || selectedEdge);

  const isModifiedConfigActive =
    !!itemState[RightSidebarMenu.MissingConfig]?.visible

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
            <ModifiedConfigSidebar hidden={!shouldShowMissingConfig} setWarnMissingProperties={setWarnMissingProperties}  />
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
                  <SidebarMenuOption
                    key={RightSidebarMenu.MissingConfig}
                    index={RightSidebarMenu.MissingConfig}
                    label={"Missing Config"}
                    icon={MdNotificationImportant}
                    onActivate={onActivate}
                    onDeactivate={onDeactivate}
                    active={
                      isModifiedConfigActive
                    }
                    showNotification={warnMissingProperties}
                  />
                
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
  console.log(mappings, index, value, force)
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
