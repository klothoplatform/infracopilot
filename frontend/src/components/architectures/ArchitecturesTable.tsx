import React, { type FC, useState } from "react";
import { Table } from "flowbite-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { User } from "@auth0/auth0-react";
import type { Architecture } from "../../shared/architecture/Architecture";
import { TbArrowDown, TbArrowsSort, TbArrowUp } from "react-icons/tb";
import classNames from "classnames";

const dateFormat = "MM/dd/yyyy hh:mm a z";

const ArchitecturesTable: FC<{
  user?: User;
  architectures: Architecture[];
}> = ({ user, architectures }) => {
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
            <Link to={`/editor/${architecture.id}`}>{architecture.name}</Link>
          </Table.Cell>
          <Table.Cell>{user?.email}</Table.Cell>
          <Table.Cell>
            {architecture.created_at &&
              format(new Date(architecture.created_at * 1000), dateFormat)}
          </Table.Cell>
        </Table.Row>
      );
    });

  return (
    <Table hoverable>
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
      </Table.Head>
      <Table.Body className="divide-y">{architectureCells}</Table.Body>
    </Table>
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
