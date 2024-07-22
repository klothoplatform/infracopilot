import type { FC } from "react";
import React from "react";
import { Button } from "flowbite-react";
import { FaRepeat } from "react-icons/fa6";
import { PiSmileyXEyes } from "react-icons/pi";

export const FallbackRenderer: FC<{
  error: any;
  resetErrorBoundary: CallableFunction;
}> = ({ resetErrorBoundary }) => {
  return (
    <div
      role="alert"
      className="flex size-full flex-col items-center justify-center px-2 py-4 dark:text-white"
    >
      <div className="flex w-fit flex-col items-center justify-center gap-2">
        <p className={"text-md mb-1 font-medium"}>Something went wrong!</p>
        <PiSmileyXEyes size={"3rem"} />
        <Button
          className="mt-4 w-32"
          color={"light"}
          onClick={() => resetErrorBoundary()}
        >
          <FaRepeat className={"mr-2"} /> Refresh
        </Button>
      </div>
    </div>
  );
};
