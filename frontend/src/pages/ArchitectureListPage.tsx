import React, { useEffect, useState } from "react";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import Navbar from "../components/navbar";
import { SidebarProvider } from "../context/SidebarContext";
import useApplicationStore from "../views/store/ApplicationStore";
import ArchitecturesTable from "../components/architectures/ArchitecturesTable";
import { ArchitectureButtonAndModal } from "../components/NewArchitectureButton";
import { WorkingOverlay } from "../components/WorkingOverlay";
import LeftSideBar from "../components/architectures/LeftSideBar";
import { ErrorOverlay } from "../components/ErrorOverlay";

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
    <>
      <SidebarProvider>
        <Navbar>
          <ArchitectureButtonAndModal />
        </Navbar>
        <div className="flex h-[calc(100vh-5rem)] w-full gap-0 overflow-hidden bg-white dark:bg-gray-800">
          <LeftSideBar />
          <div className="grow-1 shrink-1 box-border flex w-full min-w-[30%] basis-10/12 overflow-y-auto">
            <ArchitecturesTable user={user} architectures={architectures} />
          </div>
        </div>
      </SidebarProvider>
      <ErrorOverlay />
      <WorkingOverlay
        show={isLoadingArchitectures}
        message={"Loading architectures..."}
      />
    </>
  );
}

export default withAuthenticationRequired(ArchitectureListPage, {
  onRedirecting: () => (
    <WorkingOverlay show={true} message="Authenticating..." />
  ),
});
