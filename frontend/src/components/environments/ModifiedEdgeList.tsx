import type { FC } from "react";
import { type Diff, DiffStatus } from "../../shared/architecture/TopologyDiff";
import { AccordianHeader } from "./ModifiedResourceList";
import { Accordion } from "flowbite-react";

interface ModifiedEdgeListProps {
  edges: { [key: string]: Diff } | undefined;
  sourceEnvironment: string;
  targetEnvironmentId: string;
}

export const ModifiedEdgeList: FC<ModifiedEdgeListProps> = ({
  edges,
  sourceEnvironment,
  targetEnvironmentId,
}) => {
  const edgeComponents =
    edges &&
    Object.entries(edges).map(([key, edge]) => (
      <Accordion key={key} collapseAll>
        <Accordion.Panel>
          <Accordion.Title
            theme={{
              heading: "w-full pr-4",
              base: "flex w-full items-center justify-between first:rounded-t-lg last:rounded-b-lg py-2 px-4 text-left font-medium text-gray-500 dark:text-gray-400",
            }}
          >
            <AccordianHeader
              resourceId={key}
              resource={edge}
              targetEnvironmentId={targetEnvironmentId}
            />
          </Accordion.Title>
          <Accordion.Content className={"overflow-x-auto p-0"}>
            <p className={"px-4 py-2 text-sm dark:text-gray-400"}>
              {edge.status === DiffStatus.ADDED && (
                <i>
                  This edge exists in {targetEnvironmentId}, but does not exist
                  in {sourceEnvironment}
                </i>
              )}
              {edge.status === DiffStatus.REMOVED && (
                <i>
                  This edge exists in {sourceEnvironment}, but does not exist in{" "}
                  {targetEnvironmentId}
                </i>
              )}
            </p>
          </Accordion.Content>
        </Accordion.Panel>
      </Accordion>
    ));

  return (
    <div className="flex flex-col gap-4">
      {edgeComponents?.length ? (
        edgeComponents
      ) : (
        <i className={"text-sm text-gray-500 dark:text-gray-400"}>
          No edges modified
        </i>
      )}
    </div>
  );
};
