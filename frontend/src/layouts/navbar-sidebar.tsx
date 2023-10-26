import { Footer } from "flowbite-react";
import type { FC, ForwardedRef, PropsWithChildren } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Navbar from "../components/navbar";
import EditorSidebarLeft from "../components/editor/EditorSidebarLeft";
import { MdFacebook } from "react-icons/md";
import { FaDribbble, FaGithub, FaInstagram, FaTwitter } from "react-icons/fa";
import { SidebarProvider } from "../context/SidebarContext";
import EditorSidebarRight from "../components/editor/EditorSidebarRight";
import useApplicationStore from "../views/store/ApplicationStore";
import classNames from "classnames";
import { ExportIacButton } from "../components/ExportIacButton";
import { ArchitectureButtonAndModal } from "../components/NewArchitectureButton";
import { useNavigate, useParams } from "react-router-dom";
import { WorkingOverlay } from "../components/WorkingOverlay";

interface NavbarSidebarLayoutProps {
  isFooter?: boolean;
}

const NavbarSidebarLayout: FC<PropsWithChildren<NavbarSidebarLayoutProps>> =
  function ({ children, isFooter = true }) {
    const { architecture } = useApplicationStore();

    const containerRef = useRef<HTMLDivElement>(null);
    const leftSidebarRef = useRef<HTMLDivElement>(null);
    const rightSidebarRef = useRef<HTMLDivElement>(null);

    const [resourceLayout, setResourceLayout] = useState<"list" | "grid">(
      "grid",
    );

    const onResizeLeftSidebar = (newSize: number) => {
      setResourceLayout(newSize < 280 ? "list" : "grid");
    };

    return (
      <SidebarProvider>
        <Navbar>
          <EditorNavContent />
        </Navbar>
        <div
          className="flex h-[calc(100vh-5rem)] w-full gap-0 overflow-hidden bg-white dark:bg-gray-800"
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
                  className="mr-2 box-border flex min-w-[280px] max-w-[29%] shrink-0 grow-0 basis-[388px]"
                >
                  <EditorSidebarLeft resourceLayout={resourceLayout} />
                </div>
              </Resizable>
              <div
                className="grow-1 shrink-1 box-border flex w-full min-w-[30%] basis-10/12"
                ref={rightSidebarRef}
              >
                <MainContent isFooter={isFooter}>{children}</MainContent>
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
    [containerRef, childRef, width, handleSide],
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
    resetEditorState,
    addError,
    isAuthenticated,
    architecture,
    isEditorInitialized,
  } = useApplicationStore();

  const isExportButtonHidden = architecture.id === undefined;

  let { architectureId } = useParams();
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(false);
  const [workingMessage, setWorkingMessage] = useState("");

  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (!architectureId) {
      navigate("/architectures");
      return;
    }
    if (
      isAuthenticated &&
      architectureId &&
      architecture?.id !== architectureId &&
      !isInitializing
    ) {
      setIsInitializing(true);
      (async () => {
        try {
          setWorkingMessage("Loading architecture...");
          await initializeEditor(architectureId);
        } catch (e: any) {
          addError(e.message);
          navigate("/architectures");
        } finally {
          setIsInitializing(false);
          setWorkingMessage("");
        }
      })();
    }
  }, [
    isInitializing,
    isAuthenticated,
    architectureId,
    navigate,
    resetEditorState,
    initializeEditor,
    addError,
    isEditorInitialized,
    architecture?.id,
  ]);

  return (
    <div className="inline-block align-middle dark:text-white">
      <div className="flex">
        <div className="my-auto mr-6 flex font-semibold">
          {architecture.name}
        </div>
        <div className="flex">
          <ArchitectureButtonAndModal disabled={!isAuthenticated} />
        </div>
        <ExportIacButton disabled={isExportButtonHidden} />
      </div>
      <WorkingOverlay show={!!workingMessage} message={workingMessage} />
    </div>
  );
};

const MainContent = forwardRef(
  (
    { children, isFooter }: PropsWithChildren<NavbarSidebarLayoutProps>,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <div
        className="relative h-full w-full overflow-hidden dark:bg-gray-900"
        ref={ref}
      >
        {children}
        {isFooter && (
          <div className="mx-4 mt-4">
            <MainContentFooter />
          </div>
        )}
      </div>
    );
  },
);
MainContent.displayName = "MainContent";

const MainContentFooter: FC = function () {
  return (
    <>
      <Footer container>
        <div className="flex w-full flex-col gap-y-6 lg:flex-row lg:justify-between lg:gap-y-0">
          <Footer.LinkGroup>
            <Footer.Link href="#" className="mb-3 mr-3 lg:mb-0">
              Terms and conditions
            </Footer.Link>
            <Footer.Link href="#" className="mb-3 mr-3 lg:mb-0">
              Privacy Policy
            </Footer.Link>
            <Footer.Link href="#" className="mr-3">
              Licensing
            </Footer.Link>
            <Footer.Link href="#" className="mr-3">
              Cookie Policy
            </Footer.Link>
            <Footer.Link href="#">Contact</Footer.Link>
          </Footer.LinkGroup>
          <Footer.LinkGroup>
            <div className="flex gap-4 md:gap-0">
              <Footer.Link
                href="#"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <MdFacebook className="text-lg" />
              </Footer.Link>
              <Footer.Link
                href="#"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaInstagram className="text-lg" />
              </Footer.Link>
              <Footer.Link
                href="#"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaTwitter className="text-lg" />
              </Footer.Link>
              <Footer.Link
                href="#"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaGithub className="text-lg" />
              </Footer.Link>
              <Footer.Link
                href="#"
                className="hover:[&>*]:text-black dark:hover:[&>*]:text-gray-300"
              >
                <FaDribbble className="text-lg" />
              </Footer.Link>
            </div>
          </Footer.LinkGroup>
        </div>
      </Footer>
      <p className="my-8 text-center text-sm text-gray-500 dark:text-gray-300">
        &copy; 2023 CloudCompiler Inc. All rights reserved.
      </p>
    </>
  );
};

export default NavbarSidebarLayout;
