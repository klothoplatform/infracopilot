import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../../../../components/FallbackRenderer";
import { trackError } from "../../../store/ErrorStore";
import { UIError } from "../../../../shared/errors";
import useApplicationStore from "../../../store/ApplicationStore";
import React, { useCallback, useEffect, useState } from "react";
import { type TopologyDiff } from "../../../../shared/architecture/TopologyDiff";
import { environmentsInSync } from "../../../../api/EnvironmentsInSync";
import { diffEnvironments } from "../../../../api/DiffEnvironments";
import { type EnvironmentsInSync } from "../../../../shared/architecture/EnvironmentVersion";
import { EnvironmentDropdownSelector } from "../../../../components/environments/EnvironmentDropdownSelector";
import { FaCheckCircle } from "react-icons/fa";
import { FaArrowsRotate, FaCircleXmark } from "react-icons/fa6";
import { ModifiedResourceList } from "../../../../components/environments/ModifiedResourceList";
import { ModifiedEdgeList } from "../../../../components/environments/ModifiedEdgeList";
import { WorkingOverlay } from "../../../../components/WorkingOverlay";
import { Button } from "flowbite-react";
import classNames from "classnames";

export const EnvironmentsPane = () => {
  const {
    architecture,
    user,
    addError,
    resetUserDataState,
    getIdToken,
    environmentVersion,
  } = useApplicationStore();

  const [sourceEnvironment, setSourceEnvironment] = useState<string>(
    architecture.defaultEnvironment,
  );
  const [targetEnvironmentId, setTargetEnvironmentId] = useState<string>(
    architecture.defaultEnvironment !== environmentVersion.id
      ? environmentVersion.id
      : architecture.environments.find((a) => !a.default)?.id ?? "",
  );
  const [diff, setDiff] = useState<TopologyDiff | undefined>(undefined);
  const [status, setStatus] = useState<"initial" | "loading" | "loaded">(
    "initial",
  );
  const [inSync, setInSync] = useState<EnvironmentsInSync | undefined>(
    undefined,
  );

  const getDiff = useCallback(async () => {
    setStatus("loading");
    try {
      const diff = await diffEnvironments({
        architectureId: architecture.id,
        targetEnvironmentId: targetEnvironmentId,
        idToken: await getIdToken(),
      });
      setDiff(diff);
      const inSync = await environmentsInSync({
        architectureId: architecture.id,
        targetEnvironmentId: targetEnvironmentId,
        idToken: await getIdToken(),
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
      setStatus("loaded");
    }
  }, [architecture.id, getIdToken, targetEnvironmentId]);

  useEffect(() => {
    (async () => {
      if (status === "initial" && architecture) {
        await getDiff();
      }
    })();
  }, [status, architecture, getDiff]);

  console.log(diff);
  return (
    <div className="flex w-full flex-col overflow-x-auto dark:bg-gray-900">
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
        <div className="flex w-full p-4">
          <div className="flex w-full flex-col gap-4">
            <div className="mb-2 w-full border-b border-gray-300 pb-1 dark:border-gray-700 dark:text-white">
              <h2 className="text-2xl">Comparing environments</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose two environments to see what's changed or ready to be
                promoted.
              </p>
            </div>
            <div className="flex w-full items-center gap-4 rounded-lg border border-gray-300 bg-gray-100 px-6 py-2 dark:border-gray-700 dark:bg-gray-800">
              <EnvironmentDropdownSelector
                sourceEnvironment={sourceEnvironment}
                targetEnvironmentId={targetEnvironmentId}
                setSourceEnvironment={setSourceEnvironment}
                setTargetEnvironmentId={setTargetEnvironmentId}
                isSubmitting={status === "loading"}
              />

              {!inSync ? null : inSync?.inSync ? (
                <>
                  <FaCheckCircle className="text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">
                    In sync
                  </span>
                </>
              ) : (
                <div className={"flex items-center gap-2"}>
                  <FaCircleXmark className="text-red-700 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-400">
                    Out of sync
                  </span>
                </div>
              )}
              <Button
                className={"ml-auto"}
                size="sm"
                type="submit"
                color="light"
                onClick={getDiff}
              >
                <FaArrowsRotate
                  className={classNames({
                    "animate-spin": status === "loading",
                  })}
                />
              </Button>
            </div>
          </div>
        </div>
        <div className="mb-2 max-h-full min-h-0 w-full overflow-y-auto overflow-x-hidden px-4 pb-2">
          <div className="flex-column flex">
            <div className="bg-dark grow-1 w-full gap-2 overflow-auto rounded p-4 dark:text-white">
              <h2 className="mb-4 font-normal">Modified Resources</h2>
              <ModifiedResourceList
                resources={diff?.resources}
                sourceEnvironment={sourceEnvironment}
                targetEnvironmentId={targetEnvironmentId}
              />
            </div>
          </div>
          <div className="flex-column flex">
            <div className="bg-dark grow-1 w-full gap-2 overflow-auto rounded p-4 dark:text-white">
              <h2 className="text-x my-4 font-normal">Modified Edges</h2>
              <ModifiedEdgeList
                edges={diff?.edges}
                sourceEnvironment={sourceEnvironment}
                targetEnvironmentId={targetEnvironmentId}
              />
            </div>
          </div>
        </div>
        {status && (
          <WorkingOverlay
            show={status === "loading"}
            message={"Getting Differences"}
          />
        )}
      </ErrorBoundary>
    </div>
  );
};
