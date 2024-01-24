import React, { useEffect, useState } from "react";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import useApplicationStore from "./store/ApplicationStore";
import ArchitecturesTable from "../components/architectures/ArchitecturesTable";
import { WorkingOverlay } from "../components/WorkingOverlay";
import { ErrorOverlay } from "../components/ErrorOverlay";
import { BigArchitectureButtonAndModal } from "../components/NewArchitectureBigButton";
import LeftSideBar from "../components/architectures/LeftSideBar";
import { SidebarProvider } from "../context/SidebarContext";
import { FallbackRenderer } from "../components/FallbackRenderer";
import { trackError } from "./store/ErrorStore";
import { UIError } from "../shared/errors";
import { ErrorBoundary } from "react-error-boundary";
import { FaRepeat } from "react-icons/fa6";
import NavBar from "../components/NavBar";
import { Button } from "flowbite-react";

function ArchitectureListPage() {
  const {
    isAuthenticated,
    getArchitectures,
    architectures,
    user,
    addError,
    resetUserDataState,
  } = useApplicationStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingArchitectures, setIsLoadingArchitectures] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated || isLoaded || isLoadingArchitectures) {
      return;
    }
    setIsLoadingArchitectures(true);
    (async () => {
      try {
        const architectures = await getArchitectures(true);
        if (architectures.length === 0) {
          setRetryMessage("No architectures found.");
        }
      } catch (error: any) {
        const message = "Failed to load architectures!";
        trackError(
          new UIError({
            errorId: "ArchitectureListPage:LoadArchitectures",
            message,
            cause: error,
          }),
        );
        setRetryMessage(message);
      } finally {
        setIsLoadingArchitectures(false);
        setIsLoaded(true);
      }
    })();
  }, [
    isAuthenticated,
    isLoaded,
    isLoadingArchitectures,
    getArchitectures,
    addError,
  ]);

  return (
    <div
      className={
        "min-w-screen max-w-screen absolute flex h-screen max-h-screen min-h-screen w-screen flex-col overflow-hidden dark:bg-gray-800"
      }
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
        <SidebarProvider>
          <NavBar />
          <div className="flex h-full w-full flex-row overflow-hidden">
            <LeftSideBar />
            <div className="flex h-full w-full grow flex-col gap-6 px-4 py-6">
              <div
                className={
                  "flex min-h-fit w-full flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
                }
              >
                <h2 className={"mb-2 text-lg font-semibold dark:text-white"}>
                  Create a new architecture
                </h2>
                <BigArchitectureButtonAndModal />
              </div>
              <div
                className={
                  "bg-white-100 flex w-full grow flex-col gap-2 overflow-hidden rounded-lg p-4 dark:bg-gray-800"
                }
              >
                <h2 className={"mb-2 text-lg font-semibold dark:text-white"}>
                  Architectures
                </h2>
                <div className="h-full w-full overflow-auto p-4">
                  <ArchitecturesTable
                    user={user}
                    architectures={architectures}
                  />
                  {retryMessage && (
                    <div className="my-4 flex w-full items-baseline justify-start dark:text-white">
                      <div className="px-6 text-center text-sm">
                        {retryMessage}
                      </div>
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => {
                          setRetryMessage("");
                          setIsLoaded(false);
                          setIsLoadingArchitectures(false);
                        }}
                      >
                        <FaRepeat className={"mr-2"} />
                        Reload
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarProvider>
        <ErrorOverlay />
        <WorkingOverlay
          show={isLoadingArchitectures}
          message={"Loading architectures..."}
        />
      </ErrorBoundary>
    </div>
  );
}

export default withAuthenticationRequired(ArchitectureListPage, {
  onRedirecting: () => (
    <WorkingOverlay show={true} message="Authenticating..." />
  ),
});
