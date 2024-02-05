import type { FC } from "react";
import { type Diff, DiffStatus } from "../../shared/architecture/TopologyDiff";
import { accordianHeader } from "./ModifiedResourceList";
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
      <Accordion key={key}>
        <Accordion.Panel>
          <Accordion.Title>
            {accordianHeader(key, edge, sourceEnvironment, targetEnvironmentId)}
          </Accordion.Title>
          <Accordion.Content>
            {edge.status === DiffStatus.ADDED && (
              <p>
                This edge exists in {targetEnvironmentId}, but does not exist in{" "}
                {sourceEnvironment}
              </p>
            )}
            {edge.status === DiffStatus.REMOVED && (
              <p>
                This edge exists in {sourceEnvironment}, but does not exist in{" "}
                {targetEnvironmentId}
              </p>
            )}
          </Accordion.Content>
        </Accordion.Panel>
      </Accordion>
    ));

  return (
    <div className="flex flex-col gap-2">
      {edgeComponents ?? "No edges modified"}
    </div>
  );
};
