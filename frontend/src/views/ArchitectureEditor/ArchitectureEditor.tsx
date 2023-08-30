import "./ArchitectureEditor.scss";

import React, { useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import EditorPane from "./EditorPane";
import useApplicationStore from "../store/store";
import createArchitecture from "../../api/CreateArchitecture";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import Grid2 from "@mui/material/Unstable_Grid2";
import RightSidebar from "./RightSidebar";
import LeftSidebar from "./LeftSidebar";
import { Breadcrumb } from "flowbite-react";
import { HiHome } from "react-icons/hi";

function ArchitectureEditor() {
  let { architectureId } = useParams();
  const { loadArchitecture, architecture } = useApplicationStore();
  const navigate = useNavigate();

  useEffect(() => {
    (async function initArchitecture() {
      if (!architectureId) {
        architectureId = (
          await createArchitecture({
            name: "New Architecture",
            owner: "test",
            engineVersion: "1.0",
          })
        ).id;
        navigate(`/editor/${architectureId}`);
      }
      loadArchitecture(architectureId);
    })();
  }, [loadArchitecture, architectureId]);

  return (
    <NavbarSidebarLayout isFooter={false}>
      <div className="block items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex">
        <div className="mb-1 w-full">
          <div className="mb-4">
            <Breadcrumb className="mb-4">
              <Breadcrumb.Item href="#">
                <div className="flex items-center gap-x-3">
                  <HiHome className="text-xl" />
                  <span className="dark:text-white">Home</span>
                </div>
              </Breadcrumb.Item>
              <Breadcrumb.Item href={`/architecture/${architectureId}`}>
                Architecture
              </Breadcrumb.Item>
              <Breadcrumb.Item>{architecture.name}</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <div className="flex flex-col">
            <div className={"h-screen"}>
              <EditorPane />
            </div>
          </div>
        </div>
      </div>
    </NavbarSidebarLayout>
  );
}

const ReactFlowWrapper = () => {
  return (
    <ReactFlowProvider>
      <ArchitectureEditor />
    </ReactFlowProvider>
  );
};
export default ReactFlowWrapper;
