import type { FC } from "react";
import { useState } from "react";
import React from "react";
import classNames from "classnames";
import { ErrorBoundary } from "react-error-boundary";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import { FallbackRenderer } from "../FallbackRenderer";
import { Button } from "flowbite-react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { AiOutlineLoading } from "react-icons/ai";

export const ChatSidebar: FC<{
  hidden?: boolean;
}> = ({ hidden }) => {
  const { chatSignup, isChatSignupComplete, addError } = useApplicationStore();
  const [state, setState] = useState<"default" | "submitting" | "success">(
    "default",
  );
  const onChatSignup = async () => {
    if (isChatSignupComplete) {
      return;
    }
    try {
      setState("submitting");
      await chatSignup();
    } catch (e: any) {
      setState("default");
      addError(
        new UIError({
          message: "Chat signup failed. Please try again later.",
          errorId: "ChatSignup",
          cause: e,
        }),
      );
    }
    setState("success");
  };

  return (
    <div
      className={classNames("flex flex-col h-full w-full", {
        hidden: hidden,
      })}
    >
      <div className="flex h-10 w-full items-baseline justify-between border-b-[1px] p-2 dark:border-gray-700 ">
        <h2 className={"text-md font-medium dark:text-white"}>Chat</h2>
      </div>
      <ErrorBoundary
        onError={(error, info) =>
          trackError(
            new UIError({
              message: "uncaught error in ChatSidebar",
              errorId: "ChatSidebar:ErrorBoundary",
              cause: error,
              data: { info },
            }),
          )
        }
        fallbackRender={FallbackRenderer}
      >
        <div className="flex h-full flex-col items-center gap-4 overflow-y-auto px-4 pt-[25%] dark:text-gray-200">
          {isChatSignupComplete ? (
            <>
              <h3 className="text-lg font-semibold">
                You've signed up for the chat alpha!
              </h3>

              <p className={"text-pretty text-center text-sm"}>
                We'll be in touch soon.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold">
                Chat is in alpha testing
              </h3>

              <p className={"text-pretty text-center text-sm"}>
                If you'd like to join the alpha, sign up below to join the
                waiting list!
              </p>
              <Button
                size={"lg"}
                color={"purple"}
                onClick={onChatSignup}
                isProcessing={state === "submitting"}
                processingSpinner={
                  <AiOutlineLoading className="animate-spin" />
                }
              >
                {state === "submitting" ? "Signing up..." : "Sign up"}
              </Button>
            </>
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
};
