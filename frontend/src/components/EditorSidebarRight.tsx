import classNames from "classnames";
import { Alert, Card, Sidebar, Tabs, type TabsRef } from "flowbite-react";
import type { FC } from "react";
import React, { useRef, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<number>(0);
  const tabsRef = useRef<TabsRef>(null);

  const notifications = [
    {
      type: "success",
      title: "I added aws:lambda_function:lambda_01 to the architecture.",
      details: "I also added the following resources: aws:iam:role:role_01",
    },
    {
      type: "failure",
      title: "I was unable to do that for you.",
    },
    {
      type: "warning",
      title: "kubernetes:pod:pod_01 has no containers configured",
    },
    {
      type: "info",
      title: "Here's some info!",
    },
  ] as EventProps[];

  return (
    <>
      <Tabs.Group
        aria-label="Default tabs"
        /* eslint-disable-next-line react/style-prop-object */
        style={"fullWidth"}
        ref={tabsRef}
        onActiveTabChange={(tab) => setActiveTab(tab)}
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
  const [activeTab, setActiveTab] = useState<number>(0);
  const tabsRef = useRef<TabsRef>(null);

  return (
    <>
      <Tabs.Group
        aria-label="Default tabs"
        /* eslint-disable-next-line react/style-prop-object */
        style={"fullWidth"}
        ref={tabsRef}
        onActiveTabChange={(tab) => setActiveTab(tab)}
      >
        <Tabs.Item active title="Config" icon={HiCog6Tooth}>
          <ConfigTable />
        </Tabs.Item>
        <Tabs.Item title="Additional Resources">
          <AdditionalResources />
        </Tabs.Item>
      </Tabs.Group>
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
        <div className="mx-2 flex border-[1px] border-t-0 border-gray-300 bg-white py-2 pl-4 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          {details}
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
