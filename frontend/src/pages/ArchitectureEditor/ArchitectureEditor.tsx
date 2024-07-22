import type { FC, PropsWithChildren } from "react";
import React, { useEffect, useState } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { ErrorOverlay } from "../../components/ErrorOverlay";
import useApplicationStore from "../store/ApplicationStore";
import { useNavigate, useParams } from "react-router-dom";
import { WorkingOverlay } from "../../components/WorkingOverlay";
import { UIError } from "../../shared/errors";
import { isPublicAccess } from "../../shared/architecture/Access";
import { Badge, Banner } from "flowbite-react";
import { MdAnnouncement } from "react-icons/md";
import { HiX } from "react-icons/hi";
import { FaClone } from "react-icons/fa6";
import { EditorHeader } from "./EditorHeader";
import { EditorLayout } from "../../shared/EditorViewSettings";
import { DesignLayout } from "./Layouts/Design/DesignLayout";
import { ExportLayout } from "./Layouts/Export/ExportLayout";

function ArchitectureEditor() {
  const {
    user,
    architectureAccess,
    isEditorInitialized,
    initializeEditor,
    addError,
    architecture,
    isEditorInitializing,
    auth0,
    viewSettings,
  } = useApplicationStore();
  let { architectureId } = useParams();
  const navigate = useNavigate();
  const [workingMessage, setWorkingMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!architectureId) {
      navigate("/architectures");
      return;
    }
    if (isEditorInitializing) {
      return;
    }
    if (
      auth0 &&
      ((!auth0.isLoading && auth0.isAuthenticated) ||
        (!auth0.isLoading && !auth0.isAuthenticated)) &&
      architectureId &&
      (!isEditorInitialized || architecture.id !== architectureId) &&
      !isEditorInitializing
    ) {
      console.log("Initializing editor...", auth0);
      setWorkingMessage("Initializing editor...");
      (async () => {
        try {
          await initializeEditor(architectureId);
        } catch (e: any) {
          console.log(e);
          addError(
            new UIError({
              message: "Failed to initialize editor!",
              cause: e as Error,
              errorId: "ArchitectureEditor:InitializeEditor",
            }),
          );
          setWorkingMessage(undefined);
          navigate("/architectures");
        }
      })();
    }

    if (isEditorInitialized && architecture.id === architectureId) {
      setWorkingMessage(undefined);
    }
  }, [
    architectureId,
    navigate,
    initializeEditor,
    addError,
    isEditorInitialized,
    isEditorInitializing,
    architecture.id,
    auth0,
  ]);

  let currentLayout;
  switch (viewSettings.layout) {
    case EditorLayout.Design:
      currentLayout = <DesignLayout />;
      break;
    case EditorLayout.Export:
      currentLayout = <ExportLayout />;
      break;
    default:
      currentLayout = <></>;
      break;
  }

  return (
    <HeaderBodyLayout>
      <div className="flex size-full flex-col overflow-hidden border-b border-gray-200 bg-white sm:flex dark:border-gray-700 dark:bg-gray-800">
        {!user && isEditorInitialized && isPublicAccess(architectureAccess) && (
          <PublicArchitectureBanner />
        )}
        {currentLayout}
      </div>
      <ErrorOverlay />
      {workingMessage && <WorkingOverlay show message={workingMessage} />}
    </HeaderBodyLayout>
  );
}

const HeaderBodyLayout: FC<PropsWithChildren> = function ({ children }) {
  return (
    <div className="min-w-screen max-w-screen absolute flex h-screen max-h-screen min-h-screen w-screen flex-col overflow-hidden">
      <EditorHeader />
      {children}
    </div>
  );
};

const PublicArchitectureBanner = () => {
  return (
    <Banner className={"w-full"}>
      <div className="border-primary-600 bg-primary-700 text-primary-100 flex w-full justify-between border-b p-4">
        <div className="m-auto flex items-center">
          <MdAnnouncement className="mr-4 size-6" />
          <div className="flex w-full flex-wrap items-center text-sm font-normal">
            <span>You're viewing a public architecture. Click the &nbsp;</span>
            <Badge
              icon={FaClone}
              color={""}
              className={"bg-primary-800 flex w-fit shrink-0 gap-2 text-white"}
            >
              Make a copy
            </Badge>
            <span>&nbsp; button to create your own editable copy.</span>
          </div>
        </div>
        <Banner.CollapseButton
          color="purple"
          className="border-0 bg-transparent"
        >
          <HiX className="size-4" />
        </Banner.CollapseButton>
      </div>
    </Banner>
  );
};

const ReactFlowWrapper = () => {
  return (
    <ReactFlowProvider>
      <ArchitectureEditor />
    </ReactFlowProvider>
  );
};
export default ReactFlowWrapper;
