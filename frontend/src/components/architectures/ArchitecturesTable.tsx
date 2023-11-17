import React, { type FC, useState, useEffect } from "react";
import { Table, ListGroup, Button } from "flowbite-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { User } from "@auth0/auth0-react";
import type { Architecture } from "../../shared/architecture/Architecture";
import { TbArrowDown, TbArrowsSort, TbArrowUp } from "react-icons/tb";
import { IoEllipsisVerticalSharp } from "react-icons/io5";
import classNames from "classnames";
import RenameArchitectureModal from "./RenameArchitectureModal";
import { FaEllipsisH } from "react-icons/fa";
import DeleteArchitectureModal from "./DeleteArchitectureModal";
import { set } from "yaml/dist/schema/yaml-1.1/set";

const dateFormat = "MM/dd/yyyy hh:mm a z";

const ArchitecturesTable: FC<{
  user?: User;
  architectures: Architecture[];
}> = ({ user, architectures }) => {
  const [sortedBy, setSortedBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [openEditId, setOpenEditId] = useState<string | null>(null);
  const [openRenameModal, setOpenRenameModal] = useState<boolean | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean | null>(null);

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
          <Table.Cell style={{ position: "relative" }}>
            {openEditId === architecture.id ? (
              <div className="absolute left-0 top-0 z-50">
                <ListGroup>
                  <ListGroup.Item onClick={() => setOpenEditId(null)}>
                    <FaEllipsisH />
                  </ListGroup.Item>
                  <ListGroup.Item onClick={() => setOpenRenameModal(true)}>
                    Rename
                  </ListGroup.Item>
                  <ListGroup.Item onClick={() => setOpenDeleteModal(true)}>
                    Delete
                  </ListGroup.Item>
                </ListGroup>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={() => {}}
                onClick={() => {
                  setOpenEditId(architecture.id);
                }}
              >
                <IoEllipsisVerticalSharp className="hover:text-gray-900 dark:hover:text-white" />
              </div>
            )}
          </Table.Cell>
        </Table.Row>
      );
    });

  return (
    <>
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
          <Table.HeadCell>
            <span className="sr-only">Edit</span>
          </Table.HeadCell>
        </Table.Head>
        <Table.Body className="divide-y">{architectureCells}</Table.Body>
      </Table>
      {openRenameModal && openEditId != null ? (
        <RenameArchitectureModal
          onClose={() => {
            setOpenEditId(null);
            setOpenRenameModal(false);
          }}
          show={openRenameModal}
          id={openEditId}
        />
      ) : null}
      {openDeleteModal && openEditId != null ? (
        <DeleteArchitectureModal
          onClose={() => {
            setOpenEditId(null);
            setOpenDeleteModal(false);
          }}
          show={openDeleteModal}
          id={openEditId}
        />
      ) : null}
    </>
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
