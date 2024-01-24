import type { FC, ForwardedRef, PropsWithChildren } from "react";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import EditorPane from "./EditorPane";
import { ErrorOverlay } from "../../components/ErrorOverlay";
import Navbar from "../../components/NavBar";
import EditorSidebarLeft from "../../components/editor/EditorSidebarLeft";
import { SidebarProvider } from "../../context/SidebarContext";
import EditorSidebarRight from "../../components/editor/EditorSidebarRight";
import useApplicationStore from "../store/ApplicationStore";
import { ExportIacButton } from "../../components/editor/ExportIacButton";
import { ArchitectureButtonAndModal } from "../../components/NewArchitectureButton";
import { useNavigate, useParams } from "react-router-dom";
import { WorkingOverlay } from "../../components/WorkingOverlay";
import { EditableLabel } from "../../components/EditableLabel";
import { UIError } from "../../shared/errors";
import {
  ResizableContainer,
  ResizableSection,
} from "../../components/Resizable";
import { ShareButton } from "../../components/ShareButton";
import { ViewModeDropdown } from "../../components/ViewModeDropdown";
import { useScreenSize } from "../../shared/hooks/useScreenSize";
import { CloneCurrentArchitectureButton } from "../../components/editor/CloneCurrentArchitectureButton";
import { isPublicAccess } from "../../shared/architecture/Access";
import { Badge, Banner } from "flowbite-react";
import { MdAnnouncement } from "react-icons/md";
import { HiX } from "react-icons/hi";
import { FaClone } from "react-icons/fa6";

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
    architecture,
    viewSettings: { mode },
  } = useApplicationStore();
  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const [resourceLayout, setResourceLayout] = useState<"list" | "grid">("list");

  const onResizeLeftSidebar = (newSize: number) => {
    setResourceLayout(newSize <= 280 ? "list" : "grid");
  };

  return (
    <SidebarProvider>
      <div className="min-w-screen max-w-screen absolute flex h-screen max-h-screen min-h-screen w-screen flex-col overflow-hidden">
        <Navbar>
          <EditorNavContent />
        </Navbar>
        <ResizableContainer className="flex h-full w-full gap-0 overflow-hidden bg-gray-50 dark:bg-gray-800">
          {architecture?.id && (
            <>
              {mode !== "edit" ? (
                <></>
              ) : (
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
                {/*{isAuthenticated && <MainContent>{children}</MainContent>}*/}
              </div>
              <EditorSidebarRight />
            </>
          )}
        </ResizableContainer>
      </div>
    </SidebarProvider>
  );
};

const EditorNavContent: FC = function () {
  const {
    isAuthenticated,
    initializeEditor,
    addError,
    architecture,
    isEditorInitialized,
    isEditorInitializing,
    user,
    viewSettings: { mode },
    auth0,
  } = useApplicationStore();

  const isExportButtonHidden = !architecture.id;
  const { architectureAccess } = useApplicationStore();

  let { architectureId } = useParams();
  const navigate = useNavigate();
  const [workingMessage, setWorkingMessage] = useState<string | undefined>();
  const { isSmallScreen } = useScreenSize();

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
    <div className="w-full align-middle dark:text-white">
      <div className="flex w-full justify-between">
        <div className="flex gap-4">
          <ArchitectureName
            disabled={
              !isEditorInitialized ||
              architecture.id !== architectureId ||
              mode !== "edit"
            }
          />
          <div className="hidden sm:flex sm:gap-2">
            {isAuthenticated && (
              <ArchitectureButtonAndModal small={isSmallScreen} />
            )}
            {!auth0?.isLoading &&
              architecture.owner !== `user:${user?.sub}` && (
                <CloneCurrentArchitectureButton small={isSmallScreen} />
              )}
            {!!architecture.id && (
              <ExportIacButton
                disabled={isExportButtonHidden}
                small={isSmallScreen}
              />
            )}
          </div>
        </div>
        <div className="mx-4 flex gap-2">
          {isEditorInitialized ? (
            <>
              <ViewModeDropdown />
              <ShareButton
                user={user}
                architecture={architecture}
                access={architectureAccess}
                small={isSmallScreen}
              />
            </>
          ) : null}
        </div>
      </div>
      {workingMessage && <WorkingOverlay show message={workingMessage} />}
    </div>
  );
};

const ArchitectureName: FC<{
  disabled?: boolean;
}> = ({ disabled }) => {
  const { architecture, renameArchitecture, addError } = useApplicationStore();
  const onSubmit = async (newValue: string) => {
    await renameArchitecture(newValue);
  };
  const onError = (e: any) => {
    let message;
    if (e instanceof UIError) {
      message = e.message;
    }
    addError(
      new UIError({
        message: message ? message : "Failed to rename architecture!",
        cause: e as Error,
        errorId: "ArchitectureEditor:RenameArchitecture",
      }),
    );
  };

  return (
    <div className="my-auto  font-semibold">
      <EditableLabel
        initialValue={architecture.name}
        label={architecture.name}
        disabled={disabled}
        onSubmit={onSubmit}
        onError={onError}
      ></EditableLabel>
    </div>
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
