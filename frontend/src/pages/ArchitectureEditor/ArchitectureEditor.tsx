import type { FC, ForwardedRef, PropsWithChildren } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import EditorPane from "./EditorPane";
import { ErrorOverlay } from "../../components/ErrorOverlay";
import Navbar from "../../components/NavBar";
import EditorSidebarLeft from "../../components/editor/EditorSidebarLeft";
import { SidebarProvider } from "../../context/SidebarContext";
import EditorSidebarRight from "../../components/editor/EditorSidebarRight";
import useApplicationStore from "../store/ApplicationStore";
import classNames from "classnames";
import { ExportIacButton } from "../../components/ExportIacButton";
import { ArchitectureButtonAndModal } from "../../components/NewArchitectureButton";
import { useNavigate, useParams } from "react-router-dom";
import { WorkingOverlay } from "../../components/WorkingOverlay";
import { EditableLabel } from "../../components/EditableLabel";
import { UIError } from "../../shared/errors";

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

  const containerRef = useRef<HTMLDivElement>(null);
  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);

  const [resourceLayout, setResourceLayout] = useState<"list" | "grid">("grid");

  const onResizeLeftSidebar = (newSize: number) => {
    setResourceLayout(newSize < 280 ? "list" : "grid");
  };

  return (
    <SidebarProvider>
      <div className="flex h-[100vh] max-h-[100vh] w-[100vw] max-w-[100vw] flex-col">
        <Navbar>
          <EditorNavContent />
        </Navbar>
        <div
          className="flex h-full w-full gap-0 overflow-hidden bg-gray-50 dark:bg-gray-800"
          ref={containerRef}
        >
          {architecture?.id && (
            <>
              <Resizable
                containerRef={containerRef}
                childRef={leftSidebarRef}
                onResize={onResizeLeftSidebar}
              >
                <div
                  ref={leftSidebarRef}
                  className="box-border flex min-w-[280px] max-w-[29%] shrink-0 grow-0 basis-[388px]"
                >
                  <EditorSidebarLeft resourceLayout={resourceLayout} />
                </div>
              </Resizable>
              <div
                className="grow-1 shrink-1 box-border flex w-full min-w-[30%] basis-10/12"
                ref={rightSidebarRef}
              >
                {isAuthenticated && <MainContent>{children}</MainContent>}
              </div>
              <Resizable
                containerRef={containerRef}
                childRef={rightSidebarRef}
                handleSide="left"
              >
                <div
                  ref={rightSidebarRef}
                  className="right-0 box-border flex h-full w-[25rem] min-w-[15%] max-w-[39%] shrink-0 grow-0"
                >
                  <EditorSidebarRight />
                </div>
              </Resizable>
            </>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};

type ResizableProps = {
  handleSide?: "left" | "right";
  handleStyle?: React.CSSProperties;
  containerRef: React.RefObject<HTMLDivElement>;
  childRef: React.RefObject<HTMLDivElement>;
  onResize?: (newSize: number) => void;
};

export const Resizable: FC<PropsWithChildren<ResizableProps>> = function ({
  handleStyle,
  handleSide,
  children,
  containerRef,
  childRef,
  onResize,
}) {
  const isDragging = useRef(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const width = useRef(childRef.current?.clientWidth ?? 0);

  const onMouseDown = (event: any) => {
    event.preventDefault();
    isDragging.current = true;
    console.debug("resizing");
    console.debug("current width", childRef.current?.offsetWidth);
    width.current = childRef.current?.clientWidth ?? 0;
    document.addEventListener("mouseup", onMouseUp, { once: true });
    document.addEventListener("mousemove", onMouseMove);
  };

  const onMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", onMouseMove);
    console.debug("done resizing");
  };

  const onMouseMove = useCallback(
    (event: any) => {
      if (!isDragging?.current) {
        return;
      }

      const parent = containerRef.current as HTMLDivElement;
      const child = childRef.current as HTMLDivElement;
      const handle = handleRef.current as HTMLDivElement;

      const parentX = parent.getBoundingClientRect().x + window.scrollX;
      const xChange =
        event.pageX - parentX - (handle.offsetLeft + handle.offsetWidth);
      width.current =
        width.current + (handleSide !== "left" ? +xChange : -xChange);
      child.style.width = `${width.current}px`;
      child.style.flexGrow = "0";
      child.style.flexBasis = "auto";
      onResize?.(width.current);
    },
    [containerRef, childRef, handleSide, onResize],
  );

  const handleDiv = (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={classNames(
        "shrink-0 grow-0 cursor-col-resize p-0 px-[1px] mx-1 bg-gray-200 hover:bg-primary-500 dark:bg-gray-700 dark:active:bg-primary-500 dark:hover:bg-primary-500 active:bg-primary-500 active:px-[4px]",
      )}
      style={handleStyle}
      ref={handleRef}
      onMouseDown={onMouseDown}
    ></div>
  );

  return (
    <>
      {handleSide === "left" && handleDiv}
      {children}
      {handleSide !== "left" && handleDiv}
    </>
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
    renameArchitecture,
  } = useApplicationStore();

  const isExportButtonHidden = architecture.id === undefined;

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

  return (
    <div className="inline-block align-middle dark:text-white">
      <div className="flex">
        <div className="my-auto mr-6 flex font-semibold">
          <EditableLabel
            key={architecture.name}
            initialValue={architecture.name}
            label={architecture.name}
            disabled={
              !isEditorInitialized || architecture.id !== architectureId
            }
            onSubmit={async (newValue) => {
              await renameArchitecture(newValue);
            }}
            onError={(e) => {
              addError(
                new UIError({
                  message: "Renaming architecture failed!",
                  cause: e as Error,
                  errorId: "ArchitectureEditor:RenameArchitecture",
                }),
              );
            }}
          ></EditableLabel>
        </div>
        <div className="flex">
          <ArchitectureButtonAndModal disabled={!auth0?.isAuthenticated} />
        </div>
        <ExportIacButton disabled={isExportButtonHidden} />
      </div>
      {workingMessage && <WorkingOverlay show message={workingMessage} />}
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
