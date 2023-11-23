import React, { useEffect } from "react";
import { SidebarProvider } from "../context/SidebarContext";
import Navbar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
import useApplicationStore from "./store/ApplicationStore";

export const CallbackPage = () => {
  const navigate = useNavigate();

  const { isAuthenticated } = useApplicationStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/architectures");
    }
  }, [navigate, isAuthenticated]);
  return (
    <>
      <SidebarProvider>
        <Navbar></Navbar>
      </SidebarProvider>
    </>
  );
};
