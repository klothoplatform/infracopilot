import { Sidebar } from "flowbite-react";
import { HiTable } from "react-icons/hi";
import { type FC } from "react";

const LeftSideBar: FC = () => {
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
