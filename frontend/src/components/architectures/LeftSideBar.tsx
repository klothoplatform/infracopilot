import { Sidebar } from "flowbite-react";
import { HiTable } from "react-icons/hi";
import LogoutButton from "../../auth/Logout";
import { type FC } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import LoginButton from "../../auth/Login";

const LeftSideBar: FC = () => {
  const { isAuthenticated } = useAuth0();

  return (
    <Sidebar aria-label="Default sidebar example">
      <Sidebar.Items>
        <Sidebar.ItemGroup>
          <Sidebar.Item href="#" icon={HiTable}>
            <p>My Architectures</p>
          </Sidebar.Item>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
};

export default LeftSideBar;
