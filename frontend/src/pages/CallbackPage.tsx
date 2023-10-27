import React, { useEffect } from "react";
import { SidebarProvider } from "../context/SidebarContext";
import Navbar from "../components/navbar";
import { useNavigate } from "react-router-dom";
import useApplicationStore from "../views/store/ApplicationStore";

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
