import type { FC } from "react";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "flowbite-react";
import { RiLoginBoxLine } from "react-icons/ri";
import classNames from "classnames";
import { Tooltip } from "../components/Tooltip";

const LoginButton: FC<{ tooltip?: boolean }> = ({ tooltip }) => {
  const { loginWithPopup } = useAuth0();

  return (
    <Tooltip content={"Log in"} disabled={!tooltip}>
      <Button
        theme={{
          size: {
            md: "text-sm px-2 py-2 md:px-4",
          },
        }}
        pill
        size={"md"}
        color={"purple"}
        onClick={async () => {
          await loginWithPopup({});
        }}
      >
        <RiLoginBoxLine className="h-fit w-[18px] md:w-[14px]" />
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
