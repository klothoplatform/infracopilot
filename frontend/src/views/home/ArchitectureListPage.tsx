import React, { useCallback, useEffect, useRef, useState } from "react";
import "reactflow/dist/style.css";

import NavbarSidebarLayout from "../../layouts/navbar-sidebar";
import { useAuth0 } from "@auth0/auth0-react";
import Navbar from "../../components/navbar";
import { SidebarProvider } from "../../context/SidebarContext";
import useApplicationStore from "../store/ApplicationStore";
import { Sidebar } from "flowbite-react";
import {
  HiChartPie,
  HiViewBoards,
  HiInbox,
  HiUser,
  HiShoppingBag,
  HiArrowSmRight,
  HiTable,
} from "react-icons/hi";

export default function ArchitectureListPage() {
  const { architecture, loadArchitecture, idToken } = useApplicationStore();

  return (
    <Sidebar aria-label="Default sidebar example">
      <Sidebar.Items>
        <Sidebar.ItemGroup>
          <Sidebar.Item href="#" icon={HiChartPie}>
            <p>Dashboard</p>
          </Sidebar.Item>
          <Sidebar.Item
            href="#"
            icon={HiViewBoards}
            label="Pro"
            labelColor="dark"
          >
            <p>Kanban</p>
          </Sidebar.Item>
          <Sidebar.Item href="#" icon={HiInbox} label="3">
            <p>Inbox</p>
          </Sidebar.Item>
          <Sidebar.Item href="#" icon={HiUser}>
            <p>Users</p>
          </Sidebar.Item>
          <Sidebar.Item href="#" icon={HiShoppingBag}>
            <p>Products</p>
          </Sidebar.Item>
          <Sidebar.Item href="#" icon={HiArrowSmRight}>
            <p>Sign In</p>
          </Sidebar.Item>
          <Sidebar.Item href="#" icon={HiTable}>
            <p>Sign Up</p>
          </Sidebar.Item>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
