import "./ArchitectureEditor.scss";

import React, { useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

import { useNavigate, useParams } from "react-router-dom";
import EditorPane from "./EditorPane";
import useApplicationStore from "../store/store";
import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import { PiArrowElbowLeftUpBold } from "react-icons/pi";

function ArchitectureEditor() {
  let { architectureId } = useParams();
  const { architecture, loadArchitecture } = useApplicationStore();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (
        (architectureId === undefined && architecture.id) ||
        (architectureId &&
          architecture.id &&
          architectureId !== architecture.id)
      ) {
        navigate(`/editor/${architecture.id}`);
        return;
      }
      if (architectureId && !architecture.id) {
        await loadArchitecture(architectureId);
      }
    })();
  }, [navigate, architecture, architectureId, loadArchitecture]);

  return (
    <NavbarSidebarLayout isFooter={false}>
      <div className="block items-center justify-between overflow-hidden border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:flex">
        <div className={"my-2 h-[calc(100vh-7rem)] w-full"}>
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
