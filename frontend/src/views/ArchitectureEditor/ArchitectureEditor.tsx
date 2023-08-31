import "./ArchitectureEditor.scss";

import React, { useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

import { useNavigate, useParams } from "react-router-dom";
import EditorPane from "./EditorPane";
import useApplicationStore from "../store/store";
import createArchitecture from "../../api/CreateArchitecture";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";

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
      <div className="block items-center justify-between overflow-hidden border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:flex">
        <div className={"my-2 h-[calc(100vh-7rem)] w-full"}>
          <EditorPane />
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
