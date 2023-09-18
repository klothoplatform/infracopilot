import React, { useEffect } from "react";
import "reactflow/dist/style.css";

import NavbarSidebarLayout, { Resizable } from "../../layouts/navbar-sidebar";
import { useAuth0 } from "@auth0/auth0-react";
import Navbar from "../../components/navbar";
import { SidebarProvider } from "../../context/SidebarContext";
import { Table } from "flowbite-react";
import useApplicationStore from "../store/ApplicationStore";
import { Sidebar, Button, Card } from "flowbite-react";
import LoginButton from "../../auth/Login";

function Home() {
  const { architecture, loadArchitecture, setIdToken } = useApplicationStore();
  const { isAuthenticated, user, getIdTokenClaims, getAccessTokenSilently } =
    useAuth0();

  useEffect(() => {
    (async () => {
      const idToken = await getIdTokenClaims();
      console.log(idToken);
      if (idToken) {
        setIdToken(idToken.__raw);
      }
    })();
  }, [isAuthenticated, user]);

  return (
    <SidebarProvider>
      <Navbar></Navbar>
      <section className="bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-screen-xl px-4 py-8 text-center lg:px-12 lg:py-16">
          <h1 className="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white md:text-5xl lg:text-6xl">
            Some Cool Slogan Here
          </h1>
          <p className="mb-8 text-lg font-normal text-gray-500 dark:text-gray-400 sm:px-16 lg:text-xl xl:px-48">
            Another cool slogan, but smaller
          </p>
          <div className="mb-8 flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0 lg:mb-16">
            <Button >
              Learn More
            </Button>
            <Button >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>
      <section className="bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-screen-xl px-4 py-8 text-center lg:px-12 lg:py-16">
          {loginCard()}
        </div>
      </section>
    </SidebarProvider>
  );
}

export default Home;

function loginCard() {
  return (
    <section className="bg-white dark:bg-gray-900">
        <div className="sm:gap-6 lg:grid lg:grid-cols-3 lg:space-y-0 xl:gap-10">
          {/* <!-- Pricing Card --> */}
          <Card className="max-w-sm">
            <LoginButton />
            <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              <p>Noteworthy technology acquisitions 2021</p>
            </h5>
            <p className="font-normal text-gray-700 dark:text-gray-400">
              <p>
                Here are the biggest enterprise technology acquisitions of 2021
                so far, in reverse chronological order.
              </p>
            </p>
          </Card>
          <Card className="max-w-sm">
            <LoginButton />
            <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              <p>Noteworthy technology acquisitions 2021</p>
            </h5>
            <p className="font-normal text-gray-700 dark:text-gray-400">
              <p>
                Here are the biggest enterprise technology acquisitions of 2021
                so far, in reverse chronological order.
              </p>
            </p>
          </Card>
          {/* <!-- Pricing Card --> */}
          <Card className="max-w-sm">
            <LoginButton />
            <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              <p>Noteworthy technology acquisitions 2021</p>
            </h5>
            <p className="font-normal text-gray-700 dark:text-gray-400">
              <p>
                Here are the biggest enterprise technology acquisitions of 2021
                so far, in reverse chronological order.
              </p>
            </p>
          </Card>
      </div>
    </section>
  );
}
