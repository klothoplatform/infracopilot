import React from "react";
import { Button } from "flowbite-react";
import useApplicationStore from "../views/store/ApplicationStore";

const LogoutButton = () => {
  const { logout } = useApplicationStore();

  return (
    <Button
      color={"purple"}
      className="mr-2 flex gap-1"
      onClick={() => {
        logout();
      }}
    >
      Log Out
    </Button>
  );
};

export default LogoutButton;
