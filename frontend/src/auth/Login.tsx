import type { FC } from "react";
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "flowbite-react";
import { RiLoginBoxLine } from "react-icons/ri";
import classNames from "classnames";
import { Tooltip } from "../components/Tooltip";

const LoginButton: FC<{ tooltip?: boolean }> = ({ tooltip }) => {
  const { loginWithPopup, isAuthenticated, isLoading } = useAuth0();

  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <Tooltip content={"Log in"} disabled={!tooltip}>
      <Button
        theme={{
          size: {
            md: "text-sm px-2 py-2 md:px-4",
          },
        }}
        pill
        size={"sm"}
        color={"purple"}
        onClick={async () => {
          await loginWithPopup({});
        }}
      >
        <RiLoginBoxLine className="md:[h-14px] size-[18px] md:w-[14px]" />
        <span
          className={classNames(
            "hidden whitespace-nowrap md:block rounded-full p-0 ml-2",
          )}
        >
          Log in
        </span>
      </Button>
    </Tooltip>
  );
};

export default LoginButton;
