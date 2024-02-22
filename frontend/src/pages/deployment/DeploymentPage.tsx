import { useCallback, useEffect, useState } from "react";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import useApplicationStore from "../store/ApplicationStore";
import { WorkingOverlay } from "../../components/WorkingOverlay";
import { ErrorOverlay } from "../../components/ErrorOverlay";
import { FallbackRenderer } from "../../components/FallbackRenderer";
import { trackError } from "../store/ErrorStore";
import { UIError } from "../../shared/errors";
import { ErrorBoundary } from "react-error-boundary";
import deployArchitecture from "../../api/Deploy";
import destroyArchitecture from "../../api/Destroy";

import DeploymentOutput from "../../components/deployment/DeploymentOutput";
import DeploymentModal, {
  type DeploymentFormState,
} from "../../components/deployment/DeploymentModal";
import { useNavigate, useParams } from "react-router-dom";
import { DeploymentButtons } from "../../components/deployment/DeploymentButtons";
import { StackSelector } from "../../components/deployment/StackSelector";

enum DeploymentState {
  Deploying,
  Destroying,
  Refreshing,
  Idle,
}

function DeploymentPage() {
  const {
    architecture,
    environmentVersion,
    getIdToken,
    addError,
    initializeEditor,
    isEditorInitialized,
    isEditorInitializing,
    auth0,
    resetUserDataState,
    selectedStack,
  } = useApplicationStore();

  const [deploymentState, setDeploymentState] = useState<DeploymentState>(
    DeploymentState.Idle,
  );
  const [eventSource, setEventSource] = useState<EventSource | undefined>();
  const [shouldCloseEventSource, setShouldCloseEventSource] = useState(false);
  let { architectureId } = useParams();
  const navigate = useNavigate();
  const [workingMessage, setWorkingMessage] = useState<string | undefined>();

  const [log, setLog] = useState("");
  useEffect(() => {
    console.log("selectedStack", selectedStack);
  }, [selectedStack]);

  useEffect(() => {
    if (!architectureId) {
      navigate("/architectures");
      return;
    }
    if (isEditorInitializing) {
      return;
    }
    if (
      auth0 &&
      ((!auth0.isLoading && auth0.isAuthenticated) ||
        (!auth0.isLoading && !auth0.isAuthenticated)) &&
      architectureId &&
      (!isEditorInitialized || architecture.id !== architectureId) &&
      !isEditorInitializing
    ) {
      console.log("Initializing editor...", auth0);
      setWorkingMessage("Initializing editor...");
      (async () => {
        try {
          await initializeEditor(architectureId);
        } catch (e: any) {
          console.log(e);
          addError(
            new UIError({
              message: "Failed to initialize editor!",
              cause: e as Error,
              errorId: "ArchitectureEditor:InitializeEditor",
            }),
          );
          setWorkingMessage(undefined);
          navigate("/architectures");
        }
      })();
    }

    if (isEditorInitialized && architecture.id === architectureId) {
      setWorkingMessage(undefined);
    }
  }, [
    architectureId,
    navigate,
    initializeEditor,
    addError,
    isEditorInitialized,
    isEditorInitializing,
    architecture.id,
    auth0,
  ]);

  const initializeEventSource = () => {
    // Start the EventSource connection
    const es = new EventSource(
      "/api/deploy/" +
        architecture?.id +
        "/" +
        environmentVersion.id +
        "/" +
        selectedStack?.name!,
    );
    setEventSource(es);
    console.log("set event source");
    es.onmessage = (event) => {
      console.log("got event message", event);
      setLog((prevLog) => prevLog + "\n" + event.data);
      if (event.data === "done") {
        setShouldCloseEventSource(true);
      }
    };
    es.onerror = (event) => {
      console.log("got event error", event);
    };
  };

  // Make a POST request to get the EventSource URL
  const onDeploySubmit = useCallback(
    async (state: DeploymentFormState) => {
      console.log(selectedStack);
      const idToken = await getIdToken();
      initializeEventSource();
      await deployArchitecture({
        idToken,
        architecture: architecture,
        environmentVersion: environmentVersion,
        name: selectedStack?.name!,
        state,
      });
    },
    [architecture?.id, environmentVersion.id, getIdToken, selectedStack],
  );

  const onDestroySubmit = useCallback(
    async (state: DeploymentFormState) => {
      const idToken = await getIdToken();
      initializeEventSource();
      await destroyArchitecture({
        idToken,
        architecture: architecture,
        environmentVersion: environmentVersion,
        name: selectedStack?.name!,
        state,
      });
    },
    [architecture?.id, environmentVersion.id, getIdToken, selectedStack],
  );

  // Clean up the EventSource connection when the component unmounts
  useEffect(() => {
    return () => {
      console.log("unmounting event source");
      if (eventSource && shouldCloseEventSource) {
        console.log("closing event source");
        eventSource.close();
      }
    };
  }, [eventSource, shouldCloseEventSource]);

  return (
    <div
      className={" flex size-full flex-col  overflow-hidden dark:bg-gray-800"}
    >
      <ErrorBoundary
        fallbackRender={FallbackRenderer}
        onError={(error, info) => {
          trackError(
            new UIError({
              message: "uncaught error in ArchitectureListPage",
              errorId: "ArchitectureListPage:ErrorBoundary",
              cause: error,
              data: {
                info,
              },
            }),
          );
        }}
        onReset={() => resetUserDataState()}
      >
        <div className="flex size-full grow flex-col gap-6 px-4 py-6">
          <div
            className={
              "flex min-h-fit w-full flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
            }
          >
            <h2 className={"mb-2 text-lg font-semibold dark:text-white"}>
              Deploy Architecture {architecture?.name}
            </h2>

            <StackSelector />
            <DeploymentButtons
              onDeploy={() => {
                setDeploymentState(DeploymentState.Deploying);
              }}
              onRefresh={() => {
                setDeploymentState(DeploymentState.Refreshing);
              }}
              onDestroy={() => {
                setDeploymentState(DeploymentState.Destroying);
              }}
              disabled={selectedStack === undefined}
            />
            {deploymentState != DeploymentState.Idle && (
              <DeploymentModal
                show={true}
                onSubmit={async (values) => {
                  switch (deploymentState) {
                    case DeploymentState.Deploying:
                      onDeploySubmit(values);
                      break;
                    case DeploymentState.Destroying:
                      onDestroySubmit(values);
                      break;
                    case DeploymentState.Refreshing:
                      break;
                  }
                  setDeploymentState(DeploymentState.Idle);
                }}
                onClose={() => {
                  setDeploymentState(DeploymentState.Idle);
                }}
              />
            )}
          </div>
          <div
            className={
              "bg-white-100 flex w-full grow flex-col gap-2 overflow-hidden rounded-lg p-4 dark:bg-gray-800"
            }
          >
            <h2 className={"mb-2 text-lg font-semibold dark:text-white"}>
              Deployment Output
            </h2>
            <div className="size-full overflow-auto p-4">
              <div className="max-h-[400px] overflow-auto">
                <DeploymentOutput log={log} />
              </div>
            </div>
          </div>
        </div>
        {workingMessage && <WorkingOverlay show message={workingMessage} />}
        <ErrorOverlay />
      </ErrorBoundary>
    </div>
  );
}

export default withAuthenticationRequired(DeploymentPage, {
  onRedirecting: () => (
    <WorkingOverlay show={true} message="Authenticating..." />
  ),
});
