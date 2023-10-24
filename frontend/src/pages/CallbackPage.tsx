import React from "react";
import { SidebarProvider } from "../context/SidebarContext";
import Navbar from "../components/navbar";

export const CallbackPage = () => {
  return (
    <>
      <SidebarProvider>
        <Navbar></Navbar>
      </SidebarProvider>
    </>
  );
};
