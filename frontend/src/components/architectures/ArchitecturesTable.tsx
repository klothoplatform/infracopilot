import React, { type FC, useEffect, useRef, useState } from "react";
import type { CustomFlowbiteTheme } from "flowbite-react";
import { ListGroup, Table } from "flowbite-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { User } from "@auth0/auth0-react";
import type { Architecture } from "../../shared/architecture/Architecture";
import { TbArrowDown, TbArrowsSort, TbArrowUp } from "react-icons/tb";
import { IoEllipsisVerticalSharp } from "react-icons/io5";
import classNames from "classnames";
import RenameArchitectureModal from "./RenameArchitectureModal";
import DeleteArchitectureModal from "./DeleteArchitectureModal";
import useApplicationStore from "../../pages/store/ApplicationStore";

const dateFormat = "MM/dd/yyyy hh:mm a z";

const tableTheme: CustomFlowbiteTheme["table"] = {
  root: {
    shadow: "drop-shadow-none",
  },
};

const ArchitecturesTable: FC<{
  user?: User;
  architectures: Architecture[];
}> = ({ user, architectures }) => {
  const { resetEditorState } = useApplicationStore();

  const [sortedBy, setSortedBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [renaming, setRenaming] = useState<Architecture | null>(null);
  const [deleting, setDeleting] = useState<Architecture | null>(null);
  const [selectedArchitecture, setSelectedArchitecture] =
    useState<Architecture | null>(null);

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

  const architectureCells = [...architectures]
    .sort((a, b) => {
      if (sortedBy === null) return 0;
      switch (sortedBy) {
        case "name":
          return sortDirection === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "owner":
          return sortDirection === "asc"
            ? (a.owner ?? "").localeCompare(b.owner ?? "")
            : (b.owner ?? "").localeCompare(a.owner ?? "");
        case "created_at":
          return sortDirection === "asc"
            ? (a.created_at ?? 0) - (b.created_at ?? 0)
            : (b.created_at ?? 0) - (a.created_at ?? 0);
      }
      return 0;
    })
    .map((architecture) => {
      return (
        <Table.Row
          key={architecture.id}
          className="bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <Table.Cell>
            <Link
              onClick={() => resetEditorState()}
              to={`/editor/${architecture.id}`}
            >
              {architecture.name}
            </Link>
          </Table.Cell>
          <Table.Cell>{user?.email}</Table.Cell>
          <Table.Cell>
            {architecture.created_at &&
              format(new Date(architecture.created_at * 1000), dateFormat)}
          </Table.Cell>
          <Table.Cell style={{ position: "relative", width: "1%" }}>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={() => {}}
              onClick={() => {
                setSelectedArchitecture(architecture);
              }}
            >
              <IoEllipsisVerticalSharp className="hover:text-gray-900 dark:hover:text-white" />
            </div>
            {selectedArchitecture?.id === architecture.id && (
              <AdditionalActionsDropdown
                architecture={architecture}
                onClose={() => setSelectedArchitecture(null)}
                actions={[
                  {
                    id: "Rename",
                    onClick: () => {
                      setRenaming(selectedArchitecture);
                      setSelectedArchitecture(null);
                    },
                  },
                  {
                    id: "Delete",
                    onClick: () => {
                      setDeleting(selectedArchitecture);
                      setSelectedArchitecture(null);
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
    <>
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
            title="Owner"
            id="owner"
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
        <Table.Body className="divide-y">{architectureCells}</Table.Body>
      </Table>
      {renaming && (
        <RenameArchitectureModal
          onClose={() => {
            setRenaming(null);
          }}
          show={!!renaming}
          id={renaming.id}
          name={renaming.name}
        />
      )}
      {deleting && (
        <DeleteArchitectureModal
          onClose={() => {
            setDeleting(null);
          }}
          show={!!deleting}
          id={deleting.id}
          name={deleting.name}
        />
      )}
    </>
  );
};

const AdditionalActionsDropdown: FC<{
  architecture: Architecture;
  onClose?: (actionId?: string) => void;
  actions: {
    id: string;
    title?: string;
    onClick?: (architectureId: string) => void;
  }[];
}> = ({ architecture, onClose, actions }) => {
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
                action.onClick?.(architecture.id);
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
export default ArchitecturesTable;
