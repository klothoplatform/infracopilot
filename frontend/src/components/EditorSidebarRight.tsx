import type { CustomFlowbiteTheme } from "flowbite-react";
import {
  Alert,
  Button,
  Card,
  Sidebar,
  Tabs,
  type TabsRef,
} from "flowbite-react";
import type { FC, ForwardedRef } from "react";
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
  HiExclamationCircle,
  HiInformationCircle,
  HiOutlineClipboardCopy,
  HiXCircle,
} from "react-icons/hi";
import { HiBars3, HiCog6Tooth } from "react-icons/hi2";
import ConfigForm from "./ConfigForm";
import AdditionalResources from "./AdditionalResources";
import useApplicationStore from "../views/store/ApplicationStore";
import {
  RightSidebarDetailsTabs,
  RightSidebarTabs,
} from "../shared/sidebar-nav";
import type { NodeId } from "../shared/architecture/TopologyNode";
import { getIcon } from "../shared/reactflow/ResourceMappings";
import { ThemeContext } from "flowbite-react/lib/esm/components/Flowbite/ThemeContext";

const sidebarTheme: CustomFlowbiteTheme["sidebar"] = {
  root: {
    base: "h-full flex ml-auto min-w-full",
    inner:
      "h-full overflow-hidden rounded bg-gray-50 py-4 px-3 dark:bg-gray-800 min-w-full",
  },
};

const EditorSidebarRight = forwardRef(
  (props, ref: ForwardedRef<HTMLDivElement>) => {
    return (
      <Sidebar aria-label="Sidebar" collapsed={false} theme={sidebarTheme}>
        <div className="flex h-full flex-col justify-between py-2">
          <SidebarTabs />
        </div>
      </Sidebar>
    );
  },
);
EditorSidebarRight.displayName = "EditorSidebarRight";

function SidebarTabs() {
  const tabsRef = useRef<TabsRef>(null);
  const { rightSidebarSelector, navigateRightSidebar, decisions, failures } =
    useApplicationStore();

  useEffect(() => {
    tabsRef.current?.setActiveTab(rightSidebarSelector[0]);
  }, [rightSidebarSelector]);

  let notifications = [] as EventProps[];
  if (failures.length > 0) {
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
  decisions.forEach((decision) => {
    notifications.push({
      type: "success",
      title: decision.formatTitle(),
      details: decision.formatInfo(),
    });
  });
  return (
    <>
      <Tabs.Group
        aria-label="Activity Sidebar"
        /* eslint-disable-next-line react/style-prop-object */
        style={"fullWidth"}
        ref={tabsRef}
        onActiveTabChange={(tab) => {
          if (tab === rightSidebarSelector[0]) {
            return;
          }
          navigateRightSidebar([
            RightSidebarTabs[
              RightSidebarTabs[tab] as keyof typeof RightSidebarTabs
            ],
            rightSidebarSelector[1],
          ]);
        }}
      >
        <Tabs.Item active title="Changes" icon={HiInformationCircle}>
          <EventNotifications events={notifications} />
        </Tabs.Item>
        <Tabs.Item title="Details" icon={HiBars3}>
          <Details />
        </Tabs.Item>
      </Tabs.Group>
    </>
  );
}

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
    <>
      <Tabs.Group
        className="h-full"
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
            RightSidebarDetailsTabs[
              RightSidebarDetailsTabs[
                tab
              ] as keyof typeof RightSidebarDetailsTabs
            ],
          ]);
        }}
      >
        <Tabs.Item active title="Config" icon={HiCog6Tooth}>
          <ResourceIdHeader
            resourceId={selectedResource}
            edgeId={selectedEdge}
          />
          {selectedResource && (
            <ConfigForm
              key={`config-table-${selectedResource.toKlothoIdString()}`}
            />
          )}
        </Tabs.Item>
        <Tabs.Item title="Additional Resources">
          <ResourceIdHeader
            resourceId={selectedResource}
            edgeId={selectedEdge}
          />
          <AdditionalResources />
        </Tabs.Item>
      </Tabs.Group>
    </>
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
  const { mode } = useContext(ThemeContext);

  const [copied, setCopied] = useState(false);

  const onClickCopyButton = async (e: any) => {
    e.target.blur();
    await navigator.clipboard.writeText(resourceId?.toKlothoIdString() ?? "");
    setCopied(true);
    e.target.disabled = true;
    setTimeout(() => {
      e.target.disabled = false;
      setCopied(false);
    }, 3000);
  };

  return (
    <div
      className={
        "mb-2 flex flex-row items-center gap-2 border-b-2 border-gray-200 pb-1 dark:border-gray-700"
      }
    >
      {resourceId &&
        getIcon(
          resourceId.provider,
          resourceId.type,
          {
            style: { maxWidth: "50px", maxHeight: "50px" },
          },
          undefined,
          mode,
        )}
      <div className="inline-block w-full align-middle">
        <div className="text-ellipsis text-xs font-medium text-gray-500 dark:text-gray-400">
          {resourceId ? `${resourceId.provider}:${resourceId.type}` : ""}
        </div>
        <div className={"text-md text-ellipsis font-semibold dark:text-white"}>
          {resourceId
            ? `${resourceId.namespace ? resourceId.namespace + ":" : ""}${
                resourceId.name
              }`
            : edgeId}
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
  warning: HiExclamationCircle,
  info: HiInformationCircle,
};

const alertTheme: CustomFlowbiteTheme["alert"] = {
  color: {
    success:
      "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100",
    failure: "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100",
    warning:
      "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100",
    info: "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100",
  },
};

const EventNotification: FC<EventProps> = function ({ type, title, details }) {
  return (
    <div className="flex flex-col">
      <Alert
        theme={alertTheme}
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
    <Card className="mr-2 max-h-[70vh] overflow-y-auto p-4">
      <div className="flex flex-col space-y-4">
        {events.map((event, index) => (
          <EventNotification key={index} {...event} />
        ))}
      </div>
    </Card>
  );
};

export default EditorSidebarRight;
