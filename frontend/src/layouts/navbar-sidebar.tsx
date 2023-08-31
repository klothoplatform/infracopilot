import { Button, Footer } from "flowbite-react";
import type { FC, PropsWithChildren } from "react";
import React, { useState } from "react";
import Navbar from "../components/navbar";
import EditorSidebarLeft from "../components/EditorSidebarLeft";
import { MdFacebook } from "react-icons/md";
import { FaDribbble, FaGithub, FaInstagram, FaTwitter } from "react-icons/fa";
import { SidebarProvider } from "../context/SidebarContext";
import EditorSidebarRight from "../components/EditorSidebarRight";
import useApplicationStore from "../views/store/store";
import { TbFileExport } from "react-icons/tb";
import ExportIaC from "../api/ExportIaC";
import { downloadFile } from "../helpers/download-file";
import { FaFileCirclePlus } from "react-icons/fa6";
import type { NewArchitectureFormState } from "../components/NewArchitectureModal";
import NewArchitectureModal from "../components/NewArchitectureModal";
import createArchitecture from "../api/CreateArchitecture";

interface NavbarSidebarLayoutProps {
  isFooter?: boolean;
}

const NavbarSidebarLayout: FC<PropsWithChildren<NavbarSidebarLayoutProps>> =
  function ({ children, isFooter = true }) {
    return (
      <SidebarProvider>
        <Navbar>
          <EditorNavContent />
        </Navbar>
        <div className="flex items-start">
          <EditorSidebarLeft />
          <MainContent isFooter={isFooter}>{children}</MainContent>
          <EditorSidebarRight />
        </div>
      </SidebarProvider>
    );
  };

const EditorNavContent: FC = function () {
  const { architecture, loadArchitecture } = useApplicationStore();
  const [showCreateArchitectureModal, setShowCreateArchitectureModal] =
    useState(false);

  let onClickExportIac = async () => {
    const iacZip = await ExportIaC(architecture.id, architecture.version);
    const url = URL.createObjectURL(iacZip);
    downloadFile(architecture.name + ".zip", url);
  };

  let onClickNewArchitecture = () => {
    setShowCreateArchitectureModal(true);
  };
  let onCloseCreateArchitectureModal = () => {
    setShowCreateArchitectureModal(false);
  };

  let onSubmitCreateArchitectureModal = async (
    event: SubmitEvent,
    state: NewArchitectureFormState,
  ) => {
    event.preventDefault();
    setShowCreateArchitectureModal(false);
    const { id } = await createArchitecture({
      name: state.name,
      owner: "user",
      engineVersion: 1,
    });
    await loadArchitecture(id);
  };

  return (
    <div className="inline-block align-middle dark:text-white">
      <div className="mr-6 inline">{architecture.name}</div>
      <Button className="mr-2 inline gap-1" onClick={onClickNewArchitecture}>
        <FaFileCirclePlus className="mr-1" />
        <p>New Architecture</p>
      </Button>
      <Button className="inline" onClick={onClickExportIac}>
        <TbFileExport className="mr-1" />
        <p>Export IaC</p>
      </Button>
      <NewArchitectureModal
        onClose={onCloseCreateArchitectureModal}
        show={showCreateArchitectureModal}
        onSubmit={onSubmitCreateArchitectureModal}
      />
    </div>
  );
};

const MainContent: FC<PropsWithChildren<NavbarSidebarLayoutProps>> = function ({
  children,
  isFooter,
}) {
  return (
    <main className="relative h-full w-full basis-8/12 overflow-y-auto dark:bg-gray-900">
      {children}
      {isFooter && (
        <div className="mx-4 mt-4">
          <MainContentFooter />
        </div>
      )}
    </main>
  );
};

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
