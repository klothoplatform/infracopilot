import React, { type FC } from "react";
import { Table } from "flowbite-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { User } from "@auth0/auth0-react";
import type { Architecture } from "../../shared/architecture/Architecture";

const dateFormat = "MM/dd/yyyy hh:mm a z";

const ArchitecturesTable: FC<{
  user?: User;
  architectures: Architecture[];
}> = ({ user, architectures }) => {
  const architectureCells = architectures.map((architecture) => {
    return (
      <Table.Row
        key={architecture.id}
        className="bg-white dark:border-gray-700 dark:bg-gray-800"
      >
        <Table.Cell>
          <Link to={`/editor/${architecture.id}`}>{architecture.id}</Link>
        </Table.Cell>
        <Table.Cell>
          <Link to={`/editor/${architecture.id}`}>{architecture.name}</Link>
        </Table.Cell>
        <Table.Cell>{user?.email}</Table.Cell>
        <Table.Cell>
          {architecture.created_at &&
            format(new Date(architecture.created_at * 1000), dateFormat)}
        </Table.Cell>
        <Table.Cell>
          {architecture.updated_at &&
            format(new Date(architecture.updated_at * 1000), dateFormat)}
        </Table.Cell>
      </Table.Row>
    );
  });
  return (
    <Table hoverable>
      <Table.Head className={"rounded-none"}>
        <Table.HeadCell>ID</Table.HeadCell>
        <Table.HeadCell>Name</Table.HeadCell>
        <Table.HeadCell>Owner</Table.HeadCell>
        <Table.HeadCell>Created At</Table.HeadCell>
        <Table.HeadCell>Updated At</Table.HeadCell>
      </Table.Head>
      <Table.Body className="divide-y">{architectureCells}</Table.Body>
    </Table>
  );
};

export default ArchitecturesTable;
