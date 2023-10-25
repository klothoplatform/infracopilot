import React from "react";
import { SidebarProvider } from "../context/SidebarContext";
import Navbar from "../components/navbar";
import { useNavigate } from "react-router-dom";

export const CallbackPage = () => {

    const navigate = useNavigate();
    navigate("/architectures");

  return (
    <>
      <SidebarProvider>
        <Navbar></Navbar>
      </SidebarProvider>
    </>
  );
};
