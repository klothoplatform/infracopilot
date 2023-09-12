import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "flowbite-react";

const LogoutButton = () => {
  const { logout } = useAuth0();

  return (
    <Button
      color={"purple"}
      className="mr-2 flex gap-1"
      onClick={() =>
        logout({ logoutParams: { returnTo: window.location.origin } })
      }
    >
      Log Out
    </Button>
  );
};

export default LogoutButton;
