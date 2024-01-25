import React, { useEffect } from "react";
import { SidebarProvider } from "../context/SidebarContext";
import { HeaderNavBar } from "../components/HeaderNavBar";
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
        <HeaderNavBar></HeaderNavBar>
      </SidebarProvider>
    </>
  );
};
