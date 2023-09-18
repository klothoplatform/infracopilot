import { Button, Footer } from "flowbite-react";
import type { FC, ForwardedRef, PropsWithChildren } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Navbar from "../components/navbar";
import EditorSidebarLeft from "../components/EditorSidebarLeft";
import { MdFacebook } from "react-icons/md";
import { FaDribbble, FaGithub, FaInstagram, FaTwitter } from "react-icons/fa";
import { SidebarProvider } from "../context/SidebarContext";
import EditorSidebarRight from "../components/EditorSidebarRight";
import useApplicationStore from "../views/store/store";
import { TbFileExport } from "react-icons/tb";
import { FaFileCirclePlus } from "react-icons/fa6";
import type { NewArchitectureFormState } from "../components/NewArchitectureModal";
import NewArchitectureModal from "../components/NewArchitectureModal";
import { AiOutlineLoading } from "react-icons/ai";
import ExportIaC from "../api/ExportIaC";
import { downloadFile } from "../helpers/download-file";
import createArchitecture from "../api/CreateArchitecture";
import classNames from "classnames";
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
                  className="mr-2 box-border flex min-w-[280px] max-w-[29%] shrink-0 grow-0 basis-[383px]"
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

const Resizable: FC<PropsWithChildren<ResizableProps>> = function ({
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
        "shrink-0 grow-0 cursor-col-resize p-0 px-[1px] mx-1 bg-gray-200 hover:bg-purple-500 dark:bg-gray-700 dark:active:bg-purple-500 dark:hover:bg-purple-500 active:bg-purple-500 active:px-[4px]",
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
  const { architecture, loadArchitecture } = useApplicationStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingArchitecture, setIsLoadingArchitecture] = useState(false);

  let { architectureId } = useParams();
  const navigate = useNavigate();

  useLayoutEffect(() => {
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
        try {
          setIsLoadingArchitecture(true);
          await loadArchitecture(architectureId);
        } catch (e) {
          //TODO: update the store to trigger a notification
          console.error(e);
          navigate("/editor");
        } finally {
          setIsLoadingArchitecture(false);
        }
      }
    })();
  }, [
    navigate,
    architecture,
    architectureId,
    loadArchitecture,
    setIsLoadingArchitecture,
  ]);

  const [showCreateArchitectureModal, setShowCreateArchitectureModal] =
    useState(false);

  useEffect(() => {
    setShowCreateArchitectureModal(!architecture?.id && !isLoadingArchitecture);
  }, [
    architecture,
    isLoadingArchitecture,
    setIsLoadingArchitecture,
    setShowCreateArchitectureModal,
  ]);

  const hidden = architecture.id === undefined;

  let onClickExportIac = async () => {
    setIsExporting(true);
    try {
      const iacZip = await ExportIaC(architecture.id, architecture.version);
      const url = URL.createObjectURL(iacZip);
      downloadFile(architecture.name + ".zip", url);
    } finally {
      setTimeout(() => {
        // reduce flickering for fast requests
        setIsExporting(false);
      }, 200);
    }
  };

  let onClickNewArchitecture = () => {
    setShowCreateArchitectureModal(true);
  };
  let onCloseCreateArchitectureModal = () => {
    setShowCreateArchitectureModal(false);
  };

  let onSubmitCreateArchitectureModal = async (
    state: NewArchitectureFormState,
  ) => {
    setShowCreateArchitectureModal(false);
    try {
      setIsLoadingArchitecture(true);
      const { id } = await createArchitecture({
        name: state.name,
        owner: "user",
        engineVersion: 1,
      });
      await loadArchitecture(id);
    } finally {
      setIsLoadingArchitecture(false);
    }
  };

  return (
    <div className="inline-block align-middle dark:text-white">
      <div className="flex">
        <div className="my-auto mr-6 flex font-semibold">
          {architecture.name}
        </div>
        <div className="flex">
          <Button
            color={"purple"}
            className="mr-2 flex gap-1"
            onClick={onClickNewArchitecture}
          >
            <FaFileCirclePlus className="mr-1" />
            <p>New Architecture</p>
          </Button>
        </div>
        <Button
          color={"purple"}
          className="flex"
          onClick={onClickExportIac}
          isProcessing={isExporting}
          disabled={hidden}
          processingSpinner={<AiOutlineLoading className="animate-spin" />}
        >
          {!isExporting && <TbFileExport className="mr-1" />}
          <p>{isExporting ? "Exporting..." : "Export IaC"}</p>
        </Button>
      </div>
      <NewArchitectureModal
        onClose={onCloseCreateArchitectureModal}
        show={showCreateArchitectureModal}
        onSubmit={onSubmitCreateArchitectureModal}
      />
      <WorkingOverlay show={isLoadingArchitecture} />
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
