import { type FC, useEffect, useRef, useState } from "react";
import type { CustomFlowbiteTheme } from "flowbite-react";
import { ListGroup, Table } from "flowbite-react";
import { format } from "date-fns";
import type { User } from "@auth0/auth0-react";
import { TbArrowDown, TbArrowsSort, TbArrowUp } from "react-icons/tb";
import { IoEllipsisVerticalSharp } from "react-icons/io5";
import classNames from "classnames";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../FallbackRenderer";
import { UIError } from "../../shared/errors";
import { trackError } from "../../pages/store/ErrorStore";
import DeleteStackModal from "./DeleteStackModal";
import { type Stack } from "../../shared/deployment/stack";

const dateFormat = "MM/dd/yyyy hh:mm a z";

const tableTheme: CustomFlowbiteTheme["table"] = {
  root: {
    shadow: "drop-shadow-none",
  },
};

const StacksTable: FC<{
  user?: User;
  stacks: Stack[];
}> = ({ user, stacks }) => {
  const { resetEditorState, resetUserDataState } = useApplicationStore();

  const [sortedBy, setSortedBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deleting, setDeleting] = useState<Stack | null>(null);
  const [selectedstack, setSelectedStack] = useState<Stack | null>(null);

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

  console.log(stacks);
  const stackCells = [...stacks]
    .sort((a, b) => {
      if (sortedBy === null) return 0;
      switch (sortedBy) {
        case "name":
          return sortDirection === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "provider":
          return sortDirection === "asc"
            ? (a.provider ?? "").localeCompare(b.provider ?? "")
            : (b.provider ?? "").localeCompare(a.provider ?? "");
        case "created_at":
          return sortDirection === "asc"
            ? (a.created_at ?? 0) - (b.created_at ?? 0)
            : (b.created_at ?? 0) - (a.created_at ?? 0);
      }
      return 0;
    })
    .map((stack) => {
      return (
        <Table.Row
          key={stack.name}
          className="bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <Table.Cell>{stack.name}</Table.Cell>
          <Table.Cell>{stack.provider}</Table.Cell>
          <Table.Cell>
            {stack.created_at &&
              format(new Date(stack.created_at * 1000), dateFormat)}
          </Table.Cell>
          <Table.Cell style={{ position: "relative", width: "1%" }}>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={() => {}}
              onClick={() => {
                setSelectedStack(stack);
              }}
            >
              <IoEllipsisVerticalSharp className="hover:text-gray-900 dark:hover:text-white" />
            </div>
            {selectedstack?.name === stack.name && (
              <AdditionalActionsDropdown
                stack={stack}
                onClose={() => setSelectedStack(null)}
                actions={[
                  {
                    id: "Delete",
                    onClick: () => {
                      setDeleting(selectedstack);
                      setSelectedStack(null);
                    },
                  },
                ]}
              />
            )}
          </Table.Cell>
        </Table.Row>
      );
    });

  return (
    <ErrorBoundary
      fallbackRender={FallbackRenderer}
      onError={(error, info) => {
        trackError(
          new UIError({
            message: "uncaught error in stacksTable",
            errorId: "stacksTable:ErrorBoundary",
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
            title="Name"
            id="name"
            sortedBy={sortedBy}
            updateSort={updateSort}
            sortDirection={sortDirection}
          />
          <SortableHeaderCell
            title="Provider"
            id="provider"
            sortedBy={sortedBy}
            updateSort={updateSort}
            sortDirection={sortDirection}
          />
          <SortableHeaderCell
            title="Created At"
            id="created_at"
            sortedBy={sortedBy}
            updateSort={updateSort}
            sortDirection={sortDirection}
          />
          <Table.HeadCell>
            <span className="sr-only w-0">Additional Actions</span>
          </Table.HeadCell>
        </Table.Head>
        <Table.Body className="divide-y">{stackCells}</Table.Body>
      </Table>
      {deleting && (
        <DeleteStackModal
          onClose={() => {
            setDeleting(null);
          }}
          show={!!deleting}
          id={deleting.name}
          name={deleting.name}
        />
      )}
    </ErrorBoundary>
  );
};

const AdditionalActionsDropdown: FC<{
  stack: Stack;
  onClose?: (actionId?: string) => void;
  actions: {
    id: string;
    title?: string;
    onClick?: (stackId: string) => void;
  }[];
}> = ({ stack, onClose, actions }) => {
  const ref = useRef<HTMLDivElement>(null);

  // add event listener to close dropdown when clicking outside it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-[-4rem] top-0 z-50">
      <ListGroup>
        {actions?.map((action) => {
          return (
            <ListGroup.Item
              key={action.id}
              onClick={() => {
                action.onClick?.(stack.name);
              }}
            >
              {action.title ?? action.id}
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </div>
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
export default StacksTable;
