import { useAuth0 } from "@auth0/auth0-react";
import React from "react";
import { Button } from "flowbite-react";

export const SignupButton: React.FC = () => {
  const { loginWithPopup } = useAuth0();
  const handleSignUp = async () => {
    await loginWithPopup({
      authorizationParams: {
        prompt: "login",
        screen_hint: "signup",
      },
    });
  };

  return (
    <Button color={"purple"} className="mr-2 flex gap-1" onClick={handleSignUp}>
      Sign Up
    </Button>
  );
};
