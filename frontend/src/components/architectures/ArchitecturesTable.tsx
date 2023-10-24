import React, { type FC } from "react";
import { type Architecture } from "../../shared/architecture/Architecture";
import { Checkbox, Table } from "flowbite-react";
import { useAuth0 } from "@auth0/auth0-react";

interface ArchitecturesTableProps {
  architectures: Architecture[];
}
const ArchitecturesTable: FC<ArchitecturesTableProps> = (
  props: ArchitecturesTableProps,
) => {
  const { user } = useAuth0();
  const architectureCells = props.architectures.map((architecture) => {
    return (
      <Table.Row
        key={architecture.id}
        className="bg-white dark:border-gray-700 dark:bg-gray-800"
      >
        <Table.Cell className="p-4">
          <Checkbox />
        </Table.Cell>
        <Table.Cell>
          <a href={`/editor/${architecture.id}`}>{architecture.id}</a>
        </Table.Cell>
        <Table.Cell>{architecture.name}</Table.Cell>
        <Table.Cell>{user?.email}</Table.Cell>
        <Table.Cell>{architecture.created_at}</Table.Cell>
        <Table.Cell>{architecture.updated_at}</Table.Cell>
      </Table.Row>
    );
  });
  return (
    <Table>
      <Table.Head>
        <Table.HeadCell className="p-4">
          <Checkbox />
        </Table.HeadCell>
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
