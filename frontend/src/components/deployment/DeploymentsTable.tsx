import { type FC, useState } from "react";
import type { CustomFlowbiteTheme } from "flowbite-react";
import { Badge, Table } from "flowbite-react";
import { format } from "date-fns";
import { TbArrowDown, TbArrowsSort, TbArrowUp } from "react-icons/tb";
import classNames from "classnames";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../FallbackRenderer";
import { UIError } from "../../shared/errors";
import { trackError } from "../../pages/store/ErrorStore";
import {
  type Deployment,
  DeploymentStatus,
  DeploymentAction,
} from "../../shared/deployment/deployment";
import { useScreenSize } from "../../shared/hooks/useScreenSize";
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from "react-icons/vsc";

const dateFormat = "MM/dd/yyyy hh:mm a z";

const tableTheme: CustomFlowbiteTheme["table"] = {
  root: {
    shadow: "drop-shadow-none",
  },
};

interface DeploymentActionBadgeProps {
  action: string;
  isXSmallScreen: boolean;
}

const DeploymentActionBadge: FC<DeploymentActionBadgeProps> = ({
  action,
  isXSmallScreen,
}) => {
  return (
    <div>
      {action === DeploymentAction.Deploy ? (
        <Badge color="success" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffAdded /> : `Deploy`}
        </Badge>
      ) : action === DeploymentAction.Destroy ? (
        <Badge color="failure" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffRemoved /> : `Destroy`}
        </Badge>
      ) : action === DeploymentAction.Refresh ? (
        <Badge color="success" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffModified /> : `Refresh`}
        </Badge>
      ) : (
        <Badge color="warning" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffModified /> : `Unknown`}
        </Badge>
      )}
    </div>
  );
};

interface DeploymentStatusBadgeProps {
  status: string;
  isXSmallScreen: boolean;
}

const DeploymentStatusBadge: FC<DeploymentStatusBadgeProps> = ({
  status,
  isXSmallScreen,
}) => {
  return (
    <div>
      {status === DeploymentStatus.Succeeded ? (
        <Badge color="success" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffAdded /> : `Success`}
        </Badge>
      ) : status === DeploymentStatus.Failed ? (
        <Badge color="failure" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffRemoved /> : `Failed`}
        </Badge>
      ) : status === DeploymentStatus.InProgress ? (
        <Badge color="success" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffModified /> : `In Progress`}
        </Badge>
      ) : (
        <Badge color="warning" className={"whitespace-nowrap"}>
          {isXSmallScreen ? <VscDiffModified /> : `Unknown`}
        </Badge>
      )}
    </div>
  );
};

const DeploymentsTable: FC<{
  deployments: Deployment[];
}> = ({ deployments }) => {
  const { resetUserDataState } = useApplicationStore();
  const { isXSmallScreen } = useScreenSize();

  const [sortedBy, setSortedBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const updateSort = (sort: string) => {
    if (sortedBy && sortedBy === sort) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      if (sortDirection === "desc") {
        setSortedBy(null);
        return;
      }
    } else {
      setSortDirection("asc");
      setSortedBy(sort);
    }
  };

  const deploymentCells = [...deployments]
    .sort((a, b) => {
      if (sortedBy === null) return 0;
      switch (sortedBy) {
        case "id":
          return sortDirection === "asc"
            ? a.id.localeCompare(b.id)
            : b.id.localeCompare(a.id);
        case "status":
          return sortDirection === "asc"
            ? (a.status ?? "").localeCompare(b.status ?? "")
            : (b.status ?? "").localeCompare(a.status ?? "");
        case "action":
          return sortDirection === "asc"
            ? (a.action ?? "").localeCompare(b.action ?? "")
            : (b.action ?? "").localeCompare(a.action ?? "");
        case "initiated_at":
          return sortDirection === "asc"
            ? (a.initiated_at ?? 0) - (b.initiated_at ?? 0)
            : (b.initiated_at ?? 0) - (a.initiated_at ?? 0);
        case "initiated_by":
          return sortDirection === "asc"
            ? (a.initiated_by ?? "").localeCompare(b.initiated_by ?? "")
            : (b.initiated_by ?? "").localeCompare(a.initiated_by ?? "");
      }
      return 0;
    })
    .map((deployment) => {
      return (
        <Table.Row
          key={deployment.id}
          className="bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <Table.Cell>{deployment.id}</Table.Cell>
          <Table.Cell>
            <DeploymentActionBadge
              action={deployment.action}
              isXSmallScreen={isXSmallScreen}
            />
          </Table.Cell>
          <Table.Cell>
            <DeploymentStatusBadge
              status={deployment.status}
              isXSmallScreen={isXSmallScreen}
            />
          </Table.Cell>
          <Table.Cell>
            {deployment.initiated_at &&
              format(new Date(deployment.initiated_at * 1000), dateFormat)}
          </Table.Cell>
          <Table.Cell>{deployment.initiated_by}</Table.Cell>
        </Table.Row>
      );
    });

  return (
    <ErrorBoundary
      fallbackRender={FallbackRenderer}
      onError={(error, info) => {
        trackError(
          new UIError({
            message: "uncaught error in DeploymentsTable",
            errorId: "DeploymentsTable:ErrorBoundary",
            cause: error,
            data: {
              info,
            },
          }),
        );
      }}
      onReset={() => resetUserDataState()}
    >
      <Table hoverable theme={tableTheme}>
        <Table.Head>
          <SortableHeaderCell
            title="Id"
            id="id"
            sortedBy={sortedBy}
            updateSort={updateSort}
            sortDirection={sortDirection}
          />
          <SortableHeaderCell
            title="Action"
            id="action"
            sortedBy={sortedBy}
            updateSort={updateSort}
            sortDirection={sortDirection}
          />
          <SortableHeaderCell
            title="Status"
            id="status"
            sortedBy={sortedBy}
            updateSort={updateSort}
            sortDirection={sortDirection}
          />
          <SortableHeaderCell
            title="Initiated At"
            id="initiated_at"
            sortedBy={sortedBy}
            updateSort={updateSort}
            sortDirection={sortDirection}
          />
          <SortableHeaderCell
            title="Initiated By"
            id="initiated_by"
            sortedBy={sortedBy}
            updateSort={updateSort}
            sortDirection={sortDirection}
          />
        </Table.Head>
        <Table.Body className="divide-y">{deploymentCells}</Table.Body>
      </Table>
    </ErrorBoundary>
  );
};

const SortableHeaderCell: FC<{
  title: string;
  id: string;
  sortedBy: string | null;
  updateSort: (sort: string) => void;
  sortDirection?: "asc" | "desc";
}> = ({ title, id, sortedBy, updateSort, sortDirection }) => {
  return (
    <Table.HeadCell
      onClick={() => {
        updateSort(id);
      }}
    >
      <div
        className={classNames(
          "cursor-pointer flex h-full w-full items-center gap-2",
          {
            "[&>svg]:text-transparent [&>svg]:hover:text-gray-700 [&>svg]:dark:hover:text-gray-400":
              sortedBy !== id,
          },
        )}
      >
        <span>{title}</span>
        {sortedBy !== id && <TbArrowsSort />}
        {sortedBy === id && sortDirection === "asc" && <TbArrowUp />}
        {sortedBy === id && sortDirection === "desc" && <TbArrowDown />}
      </div>
    </Table.HeadCell>
  );
};
export default DeploymentsTable;
