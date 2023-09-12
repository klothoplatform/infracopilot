import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "flowbite-react";

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <Button
      color={"purple"}
      className="mr-2 flex gap-1"
      onClick={async () => {
        await loginWithRedirect({
          appState: { returnTo: window.location.origin },
        });
      }}
    >
      Log In
    </Button>
  );
};

export default LoginButton;
