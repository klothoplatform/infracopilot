/* eslint-disable jsx-a11y/anchor-is-valid */
import { type FC, type PropsWithChildren } from "react";
import { DarkThemeToggle, Dropdown, Navbar } from "flowbite-react";
import { HiSearch } from "react-icons/hi";
import { useSidebarContext } from "../context/SidebarContext";
import LoginButton from "../auth/Login";
import useApplicationStore from "../views/store/ApplicationStore";

interface NavbarProps {}

const NavBar: FC<PropsWithChildren<NavbarProps>> = function ({ children }) {
  const { isOpenOnSmallScreens, setOpenOnSmallScreens } = useSidebarContext();

  const { user, isAuthenticated } = useApplicationStore();

  return (
    <Navbar fluid>
      <div className="w-full p-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center pr-20">
            <Navbar.Brand href="/architectures">
              <span className="mr-6 pr-2"></span>
              <span className="self-center whitespace-nowrap text-2xl font-semibold dark:text-white">
                InfraCopilot
              </span>
            </Navbar.Brand>
          </div>
          <div className="mx-6 my-4 h-5 border-r-[1px] border-gray-300 shadow-black"></div>
          <div className="w-full items-start">{children}</div>
          <div className="flex items-center lg:gap-3">
            <div className="flex items-center">
              <button
                onClick={() => setOpenOnSmallScreens(!isOpenOnSmallScreens)}
                className="cursor-pointer rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:ring-2 focus:ring-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:bg-gray-700 dark:focus:ring-gray-700 lg:hidden"
              >
                <span className="sr-only">Search</span>
                <HiSearch className="h-6 w-6" />
              </button>
              <DarkThemeToggle />
            </div>
            <div className="hidden lg:block">
              {isAuthenticated && user ? <UserDropdown /> : <LoginButton />}
            </div>
          </div>
        </div>
      </div>
    </Navbar>
  );
};

const UserDropdown: FC = function () {
  const { user, logout } = useApplicationStore();

  if (!user) {
    return null;
  }

  return (
    <Dropdown
      arrowIcon={false}
      inline
      label={
        <span>
          <span className="sr-only">User menu</span>
          <img src={user.picture} alt={user.name} />
        </span>
      }
    >
      <Dropdown.Header>
        <div>
          <img src={user.picture} alt={user.name} />
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      </Dropdown.Header>
      <Dropdown.Item onClick={logout}>Log Out</Dropdown.Item>
    </Dropdown>
  );
};

export default NavBar;
