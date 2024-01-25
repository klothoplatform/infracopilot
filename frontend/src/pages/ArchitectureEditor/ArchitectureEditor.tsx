import type { FC, ForwardedRef, PropsWithChildren } from "react";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import EditorPane from "./EditorPane";
import { ErrorOverlay } from "../../components/ErrorOverlay";
import EditorSidebarLeft from "../../components/editor/EditorSidebarLeft";
import { SidebarProvider } from "../../context/SidebarContext";
import EditorSidebarRight from "../../components/editor/EditorSidebarRight";
import useApplicationStore from "../store/ApplicationStore";
import { useNavigate, useParams } from "react-router-dom";
import { WorkingOverlay } from "../../components/WorkingOverlay";
import { UIError } from "../../shared/errors";
import {
  ResizableContainer,
  ResizableSection,
} from "../../components/Resizable";
import { useScreenSize } from "../../shared/hooks/useScreenSize";
import { isPublicAccess } from "../../shared/architecture/Access";
import { Badge, Banner } from "flowbite-react";
import { MdAnnouncement } from "react-icons/md";
import { HiX } from "react-icons/hi";
import { FaClone } from "react-icons/fa6";
import { EditorHeader } from "./EditorHeader";
import { canModifyTopology } from "../../shared/ViewSettings";

function ArchitectureEditor() {
  const { user, architectureAccess, isEditorInitialized } =
    useApplicationStore();

  return (
    <NavbarSidebarLayout>
      <div className="flex h-full w-full flex-col items-center justify-between overflow-hidden border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:flex">
        {!user && isEditorInitialized && isPublicAccess(architectureAccess) && (
          <PublicArchitectureBanner />
        )}
        <EditorPane />
      </div>
      <ErrorOverlay />
    </NavbarSidebarLayout>
  );
}

const NavbarSidebarLayout: FC<PropsWithChildren> = function ({ children }) {
  const {
    initializeEditor,
    addError,
    architecture,
    isEditorInitialized,
    isEditorInitializing,
    viewSettings,
    auth0,
  } = useApplicationStore();
  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const [resourceLayout, setResourceLayout] = useState<"list" | "grid">("list");
  let { architectureId } = useParams();
  const navigate = useNavigate();
  const [workingMessage, setWorkingMessage] = useState<string | undefined>();

  const onResizeLeftSidebar = (newSize: number) => {
    setResourceLayout(newSize <= 280 ? "list" : "grid");
  };

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

  return (
    <SidebarProvider>
      <div className="min-w-screen max-w-screen absolute flex h-screen max-h-screen min-h-screen w-screen flex-col overflow-hidden">
        <EditorHeader />
        <ResizableContainer className="flex h-full w-full gap-0 overflow-hidden bg-gray-50 dark:bg-gray-800">
          {architecture?.id && canModifyTopology(viewSettings) && (
            <ResizableSection
              childRef={leftSidebarRef}
              onResize={onResizeLeftSidebar}
            >
              <div
                ref={leftSidebarRef}
                className="box-border flex h-full min-w-[280px] max-w-[29%] shrink-0 grow-0 basis-[280px]"
              >
                <EditorSidebarLeft resourceLayout={resourceLayout} />
              </div>
            </ResizableSection>
          )}
          <div className="grow-1 shrink-1 box-border flex h-full w-full min-w-[30%]">
            <MainContent>{children}</MainContent>
          </div>
          <EditorSidebarRight />
        </ResizableContainer>
      </div>
      {workingMessage && <WorkingOverlay show message={workingMessage} />}
    </SidebarProvider>
  );
};

const MainContent = forwardRef(
  ({ children }: PropsWithChildren, ref: ForwardedRef<HTMLDivElement>) => {
    return (
      <div
        className="relative h-full w-full overflow-hidden dark:bg-gray-900"
        ref={ref}
      >
        {children}
      </div>
    );
  },
);
MainContent.displayName = "MainContent";

const PublicArchitectureBanner = () => {
  return (
    <Banner className={"w-full"}>
      <div className="flex w-full justify-between border-b border-primary-600 bg-primary-700 p-4 text-primary-100">
        <div className="m-auto flex items-center">
          <MdAnnouncement className="mr-4 h-6 w-6" />
          <div className="flex w-full flex-wrap items-center text-sm font-normal">
            <span>You're viewing a public architecture. Click the &nbsp;</span>
            <Badge
              icon={FaClone}
              color={""}
              className={"flex w-fit shrink-0 gap-2 bg-primary-800 text-white"}
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
          <HiX className="h-4 w-4" />
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
