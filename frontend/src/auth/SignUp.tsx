import { useAuth0 } from "@auth0/auth0-react";
import React from "react";
import { Button } from "flowbite-react";

export const SignupButton: React.FC = () => {
  const { loginWithRedirect } = useAuth0();

  const handleSignUp = async () => {
    await loginWithRedirect({
      appState: {
        returnTo: window.location.pathname,
      },
      authorizationParams: {
        prompt: "login",
        screen_hint: "signup",
      },
    });
  };

  return <Button onClick={handleSignUp}>Sign Up</Button>;
};
