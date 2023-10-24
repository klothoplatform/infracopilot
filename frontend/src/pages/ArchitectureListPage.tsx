import React, { type FC, useEffect, useState } from "react";
import NavbarSidebarLayout from "../layouts/navbar-sidebar";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import Navbar from "../components/navbar";
import { SidebarProvider } from "../context/SidebarContext";
import useApplicationStore from "../views/store/ApplicationStore";
import { Checkbox, Sidebar, Table } from "flowbite-react";
import {
  HiChartPie,
  HiViewBoards,
  HiInbox,
  HiUser,
  HiShoppingBag,
  HiArrowSmRight,
  HiTable,
} from "react-icons/hi";
import { listArchitectures } from "../api/ListArchitectures";
import LogoutButton from "../auth/Logout";
import ArchitecturesTable from "../components/architectures/ArchitecturesTable";
import { ArchitectureButtonAndModal } from "../components/NewArchitectureButton";
import NewArchitectureModal from "../components/NewArchitectureModal";
import { WorkingOverlay } from "../components/WorkingOverlay";
import LeftSideBar from "../components/architectures/LeftSideBar";

function ArchitectureListPage() {
  const { setArchitectures, architectures, idToken, setIdToken } =
    useApplicationStore();
  const [loaded, setLoaded] = useState(false);
  const { user, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  useEffect(() => {
    async function fetchArchitectures() {
      const usersArchitectures = await listArchitectures(idToken);
      setArchitectures(usersArchitectures);
      setLoaded(true);
    }
    if (!loaded) {
      fetchArchitectures();
    }
  }, [idToken, loaded]);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated && !isLoading) {
        await loginWithRedirect({
          appState: { returnTo: window.location.pathname },
        });
      }
    })();
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  return (
    <>
      <SidebarProvider>
        <Navbar>
          <ArchitectureButtonAndModal />
        </Navbar>
        <div className="flex h-[calc(100vh-5rem)] w-full gap-0 overflow-hidden bg-white dark:bg-gray-800">
          <LeftSideBar />
          <div className="grow-1 shrink-1 box-border flex w-full min-w-[30%] basis-10/12">
            <ArchitecturesTable architectures={architectures} />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default withAuthenticationRequired(ArchitectureListPage, {
  onRedirecting: () => <WorkingOverlay show={true} />,
});
