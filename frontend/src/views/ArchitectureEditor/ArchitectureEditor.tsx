import "./ArchitectureEditor.scss";

import React from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import EditorPane from "./EditorPane";
import useApplicationStore from "../store/ApplicationStore";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";

function ArchitectureEditor() {
  const { architecture } = useApplicationStore();

  return (
    <NavbarSidebarLayout isFooter={false}>
      <div className="block items-center justify-between overflow-hidden border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:flex">
        <div className={"my-2 h-[calc(100vh-5rem)] w-full"}>
          {architecture.id && <EditorPane />}
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
