import {
  HiCheckCircle,
  HiExclamation,
  HiInformationCircle,
  HiXCircle,
} from "react-icons/hi";
import type { FC } from "react";
import React from "react";
import { Alert } from "flowbite-react";
import { OutlinedAlert } from "../../shared/custom-themes";
import useApplicationStore from "../../pages/store/ApplicationStore";
import classNames from "classnames";
import { ErrorBoundary } from "react-error-boundary";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import { FallbackRenderer } from "../FallbackRenderer";

export const ChangesSidebar: FC<{
  hidden?: boolean;
}> = ({ hidden }) => {
  const { changeNotifications } = useApplicationStore();

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
        <>
          {changeNotifications.map((changeNotification) => {
            <span>{changeNotification.title}</span>;
          })}
          <div className="flex h-full flex-col justify-between overflow-y-auto px-2 py-4">
            <EventNotifications
              events={changeNotifications.sort(
                (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0),
              )}
            />
          </div>
        </>
      </ErrorBoundary>
    </div>
  );
};

export enum NotificationType {
  Success = "success",
  Failure = "failure",
  Warning = "warning",
  Info = "info",
}

export interface ChangeNotification {
  type: NotificationType;
  title?: string;
  details?: string;
  timestamp?: number;
}

const eventIconMap = {
  success: HiCheckCircle,
  failure: HiXCircle,
  warning: HiExclamation,
  info: HiInformationCircle,
};

const EventNotification: FC<ChangeNotification> = function ({
  type,
  title,
  details,
}) {
  return (
    <div className="flex flex-col whitespace-pre-wrap">
      <Alert
        theme={OutlinedAlert}
        color={type}
        icon={eventIconMap[type]}
        title={title}
      >
        <div className="text-ellipsis">{title}</div>
      </Alert>

      {typeof details === "string" && details.length > 0 && (
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
  events: ChangeNotification[];
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
