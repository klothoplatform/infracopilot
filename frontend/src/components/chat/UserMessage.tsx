import type { FC, PropsWithChildren } from "react";
import type { ChatMessage, MessageProps } from "@azure/communication-react";
import classNames from "classnames";

export interface UserMessageProps {
  options: MessageProps & {
    showDisplayName?: boolean;
  };
  onRenderContent: FC<MessageProps>;
}

// render a chat bubble for a user message. Showing the user's name, message content, and the time the message was sent.
// Border rounding is determined by the message's placement in a conversation. Messages can be top-attached, bottom-attached, both, or standalone.
// If both top and bottom are attached, the message bubble is not rounded.
// float the message to the right if it is sent by the current user and include left padding to clealy differentiate between the user's own messages and others'.
export const UserMessage: FC<UserMessageProps> = ({
  options,
  onRenderContent,
}: PropsWithChildren<UserMessageProps>) => {
  const message = options.message as ChatMessage;
  const { createdOn, senderDisplayName, attached } = message;
  const showDisplayName = options.showDisplayName ?? true;
  return (
    <div
      className={classNames(
        "p-2 bg-gray-200 dark:bg-gray-700 flex w-fit flex-col items-end",
        {
          "rounded-t-lg": attached === "bottom" || !attached,
          "rounded-b-lg": attached === "top" || !attached,
        },
      )}
    >
      {(showDisplayName || options.showDate) &&
        (!attached || attached === "bottom") && (
          <div className="flex justify-between">
            <div className="font-bold">
              {showDisplayName &&
                (attached === "bottom" || !attached) &&
                senderDisplayName}
            </div>
            <div className="text-sm">
              {options.showDate &&
                createdOn.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "numeric",
                })}
            </div>
          </div>
        )}
      <div className="flex w-fit max-w-full justify-end whitespace-pre text-wrap">
        {onRenderContent ? onRenderContent(options) : String(message || "")}
      </div>
    </div>
  );
};
