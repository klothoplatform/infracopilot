import { type FC, type PropsWithChildren, useState } from "react";
import { DarkThemeToggle, Dropdown, Navbar } from "flowbite-react";
import LoginButton from "../auth/Login";
import useApplicationStore from "../pages/store/ApplicationStore";
import { Link } from "react-router-dom";

interface NavbarProps {}

const NavBar: FC<PropsWithChildren<NavbarProps>> = function ({ children }) {
  const { user, isAuthenticated } = useApplicationStore();

  return (
    <Navbar fluid>
      <div className="w-full p-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center pr-20">
            <Navbar.Brand as={Link} to="/architectures">
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
              <DarkThemeToggle />
            </div>
            <div className="hidden lg:block">
              {isAuthenticated && user ? <AccountDropdown /> : <LoginButton />}
            </div>
          </div>
        </div>
      </div>
    </Navbar>
  );
};

const AccountDropdown: FC = function () {
  const { user, logout } = useApplicationStore();
  const [noPicture, setNoPicture] = useState(false);

  if (!user) {
    return null;
  }

  const handleImageError = () => {
    setNoPicture(true);
  };

  return (
    <Dropdown
      arrowIcon={false}
      inline
      label={
        <span className="h-10 w-10 rounded-full">
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
        </div>
      </Dropdown.Header>
      <Dropdown.Item className="rounded-b-lg" onClick={logout}>
        Log out
      </Dropdown.Item>
    </Dropdown>
  );
};

export default NavBar;
