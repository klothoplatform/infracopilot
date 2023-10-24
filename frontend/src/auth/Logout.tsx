import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "flowbite-react";
import useApplicationStore from "../views/store/ApplicationStore";

const LogoutButton = () => {
  const { logout } = useAuth0();
  const { setIdToken, setArchitectures } = useApplicationStore();

  const logoutUrl = process.env.REACT_APP_AUTH0_LOGOUT_URL;
  console.log(logoutUrl, "logouturl");
  return (
    <Button
      color={"purple"}
      className="mr-2 flex gap-1"
      onClick={() => {
        setIdToken("default");
        setArchitectures([]);
        logout({
          logoutParams: { returnTo: logoutUrl },
        });
      }}
    >
      Log Out
    </Button>
  );
};

export default LogoutButton;
