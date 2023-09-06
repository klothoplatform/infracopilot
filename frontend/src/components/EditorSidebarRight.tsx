import classNames from "classnames";
import { Alert, Card, Sidebar, Tabs, type TabsRef } from "flowbite-react";
import type { FC } from "react";
import React, { useEffect, useRef } from "react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiXCircle,
} from "react-icons/hi";

import { useSidebarContext } from "../context/SidebarContext";
import { HiBars3, HiCog6Tooth } from "react-icons/hi2";
import ConfigTable from "./ConfigTable";
import AdditionalResources from "./AdditionalResources";
import useApplicationStore from "../views/store/store";
import {
  RightSidebarDetailsTabs,
  RightSidebarTabs,
} from "../shared/sidebar-nav";
import type { NodeId } from "../shared/architecture/TopologyNode";

const EditorSidebarRight: FC = function () {
  const { isOpenOnSmallScreens: isSidebarOpenOnSmallScreens } =
    useSidebarContext();

  return (
    <div
      className={classNames("lg:!block right-10 basis-2/12", {
        hidden: !isSidebarOpenOnSmallScreens,
      })}
    >
      <Sidebar aria-label="Sidebar" collapsed={false} className={"w-fit"}>
        <div className="flex max-h-[calc(100vh-7rem)] flex-col justify-between py-2">
          <SidebarTabs />
        </div>
      </Sidebar>
    </div>
  );
};

function SidebarTabs() {
  const tabsRef = useRef<TabsRef>(null);
  const { rightSidebarSelector, navigateRightSidebar, decisions, failures } = useApplicationStore();

  useEffect(() => {
    tabsRef.current?.setActiveTab(rightSidebarSelector[0]);
  }, [rightSidebarSelector]);


  let notifications = [] as EventProps[]
  if (failures.length > 0) {
    notifications = failures.map((failure) => {
      return {
        type: "failure",
        title: failure,
      }
    })
  } else {
     decisions.forEach((decision) => {
        notifications.push({
          type: "success",
          title: decision.formatTitle(),
          details: decision.formatInfo(),
        })
      
    })
  }

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
  const { rightSidebarSelector, navigateRightSidebar, selectedResource } =
    useApplicationStore();

  useEffect(() => {
    tabsRef.current?.setActiveTab(rightSidebarSelector[1]);
  }, [rightSidebarSelector]);

  return (
    <>
      <Tabs.Group
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
          <ResourceIdHeader resourceId={selectedResource} />
          <ConfigTable />
        </Tabs.Item>
        <Tabs.Item title="Additional Resources">
          <ResourceIdHeader resourceId={selectedResource} />
          <AdditionalResources />
        </Tabs.Item>
      </Tabs.Group>
    </>
  );
};

type ResourceIdHeaderProps = {
  resourceId?: NodeId;
};

const ResourceIdHeader: FC<ResourceIdHeaderProps> = function ({ resourceId }) {
  return (
    <div className="mb-2 flex rounded-t-lg border-2 border-gray-100 bg-gray-50 py-4 pl-6 text-sm font-medium drop-shadow-md first:ml-0 dark:border-gray-700 dark:bg-gray-600 dark:text-white">
      {resourceId?.toKlothoIdString() ?? "No resource selected"}
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

const EventNotification: FC<EventProps> = function ({ type, title, details }) {
  return (
    <div className="flex flex-col">
      <Alert color={type} icon={eventIconMap[type]}>
        <span>
          <p>{title}</p>
        </span>
      </Alert>

      {details && (
        <div className="mx-2 flex border-[1px] border-t-0 border-gray-300 bg-white py-2 pl-4 pr-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          {details.split(/\n/).map(line => <React.Fragment key={line}>{line}<br/></React.Fragment>)}
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
    <Card className="drop-shadow-xs p-4">
      <div className="flex flex-col space-y-4">
        {events.map((event, index) => (
          <EventNotification key={index} {...event} />
        ))}
      </div>
    </Card>
  );
};

export default EditorSidebarRight;
