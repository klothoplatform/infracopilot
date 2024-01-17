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
import { ExportIacButton } from "../../components/ExportIacButton";
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
import { screenSizeIsAtMost } from "../../helpers/screen-size";

function ArchitectureEditor() {
  return (
    <NavbarSidebarLayout>
      <div className="flex h-full w-full flex-col items-center justify-between overflow-hidden border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:flex">
        <EditorPane />
      </div>
      <ErrorOverlay />
    </NavbarSidebarLayout>
  );
}

const NavbarSidebarLayout: FC<PropsWithChildren> = function ({ children }) {
  const { architecture, isAuthenticated } = useApplicationStore();

  const leftSidebarRef = useRef<HTMLDivElement>(null);
  // const rightSidebarRef = useRef<HTMLDivElement>(null);

  const [resourceLayout, setResourceLayout] = useState<"list" | "grid">("list");

  const onResizeLeftSidebar = (newSize: number) => {
    setResourceLayout(newSize <= 280 ? "list" : "grid");
  };

  return (
    <SidebarProvider>
      <div className="min-w-screen max-w-screen flex h-screen max-h-screen min-h-screen w-screen flex-col">
        <Navbar>
          <EditorNavContent />
        </Navbar>
        <ResizableContainer className="flex h-full w-full gap-0 overflow-hidden bg-gray-50 dark:bg-gray-800">
          {architecture?.id && (
            <>
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
              <div className="grow-1 shrink-1 box-border flex h-full w-full min-w-[30%]">
                {isAuthenticated && <MainContent>{children}</MainContent>}
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
    initializeEditor,
    addError,
    auth0,
    architecture,
    isEditorInitialized,
    isEditorInitializing,
    user,
    getArchitectureAccess,
  } = useApplicationStore();

  const isExportButtonHidden = architecture.id === undefined;
  const { architectureAccess } = useApplicationStore();

  let { architectureId } = useParams();
  const navigate = useNavigate();
  const [workingMessage, setWorkingMessage] = useState<string | undefined>();
  const [access, setAccess] = useState(architectureAccess);
  const [isSmallScreen, setIsSmallScreen] = useState(screenSizeIsAtMost("md"));

  useEffect(() => {
    (async () => {
      if (isEditorInitialized && architecture.id) {
        setAccess(await getArchitectureAccess(architecture.id, true));
      }
    })();
  }, [
    architecture,
    architectureAccess,
    getArchitectureAccess,
    isEditorInitialized,
  ]);

  useEffect(() => {
    if (!architectureId) {
      navigate("/architectures");
      return;
    }
    if (isEditorInitializing) {
      return;
    }
    if (
      auth0?.isAuthenticated &&
      architectureId &&
      (!isEditorInitialized || architecture.id !== architectureId) &&
      !isEditorInitializing
    ) {
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
    auth0?.isAuthenticated,
    architectureId,
    navigate,
    initializeEditor,
    addError,
    isEditorInitialized,
    isEditorInitializing,
    architecture.id,
  ]);

  useEffect(() => {
    function handleResize() {
      setIsSmallScreen(screenSizeIsAtMost("md"));
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="w-full align-middle dark:text-white">
      <div className="flex w-full justify-between">
        <div className="flex">
          <ArchitectureName
            disabled={
              !isEditorInitialized || architecture.id !== architectureId
            }
          />
          <div className="hidden sm:flex">
            <ArchitectureButtonAndModal
              disabled={!auth0?.isAuthenticated}
              small={isSmallScreen}
            />
            <ExportIacButton
              disabled={isExportButtonHidden}
              small={isSmallScreen}
            />
          </div>
        </div>
        <div className="mx-4">
          {user && isEditorInitialized ? (
            <ShareButton
              user={user}
              architecture={architecture}
              access={access}
              small={isSmallScreen}
            />
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
    <div className="my-auto mr-6 flex font-semibold">
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

const ReactFlowWrapper = () => {
  return (
    <ReactFlowProvider>
      <ArchitectureEditor />
    </ReactFlowProvider>
  );
};
export default ReactFlowWrapper;
