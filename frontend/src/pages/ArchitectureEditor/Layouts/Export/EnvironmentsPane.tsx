import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../../../../components/FallbackRenderer";
import { trackError } from "../../../store/ErrorStore";
import { UIError } from "../../../../shared/errors";
import useApplicationStore from "../../../store/ApplicationStore";
import { useEffect, useState } from "react";
import {
  DiffStatus,
  type TopologyDiff,
} from "../../../../shared/architecture/TopologyDiff";
import { environmentsInSync } from "../../../../api/EnvironmentsInSync";
import { diffEnvironments } from "../../../../api/DiffEnvironments";
import { type EnvironmentsInSync } from "../../../../shared/architecture/EnvironmentVersion";
import { Accordion, Badge, Table } from "flowbite-react";
import {
  EnvironmentDropdownSelector,
  type EnvironmentDropdownSelectorFormState,
} from "../../../../components/environments/EnvironmentDropdownSelector";
import { FaCheckCircle } from "react-icons/fa";
import { FaCircleXmark } from "react-icons/fa6";
import { ModifiedResourceList } from "../../../../components/environments/ModifiedResourceList";
import { ModifiedEdgeList } from "../../../../components/environments/ModifiedEdgeList";

export const EnvironmentsPane = () => {
  const { architecture, user, addError, resetUserDataState, currentIdToken } =
    useApplicationStore();

  const [sourceEnvironment, setSourceEnvironment] = useState<string>("");
  const [targetEnvironmentId, setTargetEnvironmentId] = useState<string>("");
  const [diff, setDiff] = useState<TopologyDiff | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [inSync, setInSync] = useState<EnvironmentsInSync | undefined>(
    undefined,
  );

  const onSubmit = async (state: EnvironmentDropdownSelectorFormState) => {
    setSourceEnvironment(state.sourceEnvironment);
    setTargetEnvironmentId(state.targetEnvironmentId);
    if (!isLoading && !isLoaded && architecture) {
      try {
        const diff = await diffEnvironments({
          architectureId: architecture.id,
          targetEnvironmentId: state.targetEnvironmentId,
          idToken: currentIdToken.idToken,
        });
        setDiff(diff);

        const inSync = await environmentsInSync({
          architectureId: architecture.id,
          targetEnvironmentId: state.targetEnvironmentId,
          idToken: currentIdToken.idToken,
        });
        setInSync(inSync);
      } catch (error: any) {
        console.error(error);
        const message = "Failed to get environment info!";
        trackError(
          new UIError({
            errorId: "EnvironmentsPane:diffEnvironments",
            message,
            cause: error,
          }),
        );
      } finally {
        setIsLoading(false);
        setIsLoaded(true);
      }
    }
  };

  console.log(diff);
  return (
    <div>
      <ErrorBoundary
        fallbackRender={FallbackRenderer}
        onError={(error, info) => {
          trackError(
            new UIError({
              message: "uncaught error in EnvironmentsPane",
              errorId: "EnvironmentsPane:ErrorBoundary",
              cause: error,
              data: {
                info,
              },
            }),
          );
        }}
        onReset={() => resetUserDataState()}
      >
        <div className="p-2">
          <div className="flex items-center gap-4">
            <EnvironmentDropdownSelector
              onSubmit={onSubmit}
              isSubmitting={isLoading}
            />
            {!inSync ? null : inSync?.inSync ? (
              <div className="flex items-center gap-4">
                <span className="me-2 text-green-600">In sync</span>
                <FaCheckCircle className="text-green-600" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="me-2 text-red-600">Out of sync</span>
                <FaCircleXmark className="text-red-600" />
              </div>
            )}
          </div>
        </div>
        <div className="position-fixed end-0 start-0 mb-2 max-h-full min-h-0 w-full overflow-y-auto overflow-x-hidden pb-2">
          <div className="d-flex flex-column vh-100 w-full">
            <div className="bg-dark grow-1 w-full overflow-auto rounded p-4 dark:text-white">
              <h2 className="mb-4 text-xl font-semibold">Modified Resources</h2>
              <ModifiedResourceList
                resources={diff?.resources}
                sourceEnvironment={sourceEnvironment}
                targetEnvironmentId={targetEnvironmentId}
              />
            </div>
          </div>
          <div className="d-flex flex-column vh-100">
            <div className="bg-dark grow-1 overflow-auto rounded p-4 dark:text-white">
              <h2 className="my-4 text-xl font-semibold">Modified Edges</h2>
              <ModifiedEdgeList
                edges={diff?.edges}
                sourceEnvironment={sourceEnvironment}
                targetEnvironmentId={targetEnvironmentId}
              />
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};
