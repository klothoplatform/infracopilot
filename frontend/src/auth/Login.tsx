import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "flowbite-react";

const LoginButton = () => {
  const { loginWithPopup } = useAuth0();

  return (
    <Button
      color={"purple"}
      style={{ width: "100px" }}
      className="mr-2 flex gap-1"
      onClick={async () => {
        await loginWithPopup({});
      }}
    >
      Log In
    </Button>
  );
};

export default LoginButton;
