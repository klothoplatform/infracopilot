import React, { useEffect, useState } from "react";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import Navbar from "../components/navbar";
import { SidebarProvider } from "../context/SidebarContext";
import useApplicationStore from "./store/ApplicationStore";
import ArchitecturesTable from "../components/architectures/ArchitecturesTable";
import { WorkingOverlay } from "../components/WorkingOverlay";
import { ErrorOverlay } from "../components/ErrorOverlay";
import LeftSideBar from "../components/architectures/LeftSideBar";
import { BigArchitectureButtonAndModal } from "../components/NewArchitectureBigButton";

function ArchitectureListPage() {
  const { isAuthenticated, getArchitectures, architectures, user, addError } =
    useApplicationStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingArchitectures, setIsLoadingArchitectures] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || isLoaded || isLoadingArchitectures) {
      return;
    }
    setIsLoadingArchitectures(true);
    (async () => {
      try {
        await getArchitectures(true);
      } catch (error: any) {
        addError(error.message);
      } finally {
        setIsLoadingArchitectures(false);
      }
      setIsLoaded(true);
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
        "flex h-[100vh] max-h-[100vh] w-[100wh] max-w-[100wh] flex-col overflow-hidden dark:bg-gray-800"
      }
    >
      <SidebarProvider>
        <Navbar />
        <div className="flex h-full w-full flex-row overflow-hidden">
          <LeftSideBar />
          <div className="flex h-full w-full grow flex-col gap-6 px-4 py-6">
            <div
              className={
                "flex min-h-fit w-full flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
              }
            >
              <h2 className={"mb-2 text-lg font-semibold dark:text-white"}>
                Create a New Architecture
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
                <ArchitecturesTable user={user} architectures={architectures} />
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
    </div>
  );
}

export default withAuthenticationRequired(ArchitectureListPage, {
  onRedirecting: () => (
    <WorkingOverlay show={true} message="Authenticating..." />
  ),
});
