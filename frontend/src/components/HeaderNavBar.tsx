import React, { type FC, type PropsWithChildren, useState } from "react";
import {
  DarkThemeToggle,
  Dropdown,
  Navbar,
  useThemeMode,
} from "flowbite-react";
import LoginButton from "../auth/Login";
import useApplicationStore from "../pages/store/ApplicationStore";
import { Link } from "react-router-dom";
import { useScreenSize } from "../shared/hooks/useScreenSize";

interface NavbarProps {}

export const HeaderNavBar: FC<PropsWithChildren<NavbarProps>> = function ({
  children,
}) {
  return (
    <Navbar fluid>
      <div className="w-full px-1 pt-1 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <Navbar.Brand as={Link} to="/architectures" className="pr-2">
            <span className="whitespace-nowrap px-2 py-1 text-2xl font-semibold dark:text-white">
              InfraCopilot
            </span>
          </Navbar.Brand>
          <div className="mr-3 h-5 border-r-[1px] border-gray-300 py-4 shadow-black dark:border-gray-700"></div>
          <div className="w-full items-start">{children}</div>
        </div>
      </div>
    </Navbar>
  );
};

export const HeaderNavBarRow1Right: FC<{
  user: any;
  isAuthenticated: boolean;
}> = ({ user, isAuthenticated }) => {
  const { isSmallScreen } = useScreenSize();

  return (
    <div className="flex h-fit w-fit items-center justify-end lg:gap-3">
      {isAuthenticated && user ? (
        <AccountDropdown />
      ) : (
        <LoginButton tooltip={isSmallScreen} />
      )}
    </div>
  );
};

const AccountDropdown: FC = function () {
  const { user, logout } = useApplicationStore();
  const [noPicture, setNoPicture] = useState(false);
  const [mode, setMode, toggleMode] = useThemeMode();

  if (!user) {
    return null;
  }

  const handleImageError = () => {
    setNoPicture(true);
  };

  return (
    <Dropdown
      className="z-50"
      arrowIcon={false}
      inline
      label={
        <span className="h-9 w-9 rounded-full">
          <div className="sr-only">account menu</div>
          {noPicture ? (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary-400 text-lg font-light text-white dark:bg-primary-500">
              {(user.given_name ?? "")[0] ?? ""}
              {(user.family_name ?? "")[0] ?? ""}
            </div>
          ) : (
            <img
              className="rounded-full"
              src={user.picture}
              onError={handleImageError}
              alt="Account"
            />
          )}
        </span>
      }
    >
      <Dropdown.Header>
        <div className="flex items-center gap-2">
          {noPicture ? (
            <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-primary-400 text-lg font-light text-white dark:bg-primary-500">
              {(user.given_name ?? "")[0] ?? ""}
              {(user.family_name ?? "")[0] ?? ""}
            </div>
          ) : (
            <img
              className="max-h-[3.25rem] max-w-[3.25rem] rounded-full"
              src={user.picture}
              alt="Account"
              onError={handleImageError}
            />
          )}
          <div>
            <h2 className="font-medium">{user.name}</h2>
            <p>{user.email}</p>
          </div>

          <DarkThemeToggle
            onClick={() => {
              const newMode = mode === "dark" ? "light" : "dark";
              localStorage.setItem("theme", newMode);
              toggleMode();
            }}
          />
        </div>
      </Dropdown.Header>
      <Dropdown.Item onClick={logout}>Log out</Dropdown.Item>
    </Dropdown>
  );
};
