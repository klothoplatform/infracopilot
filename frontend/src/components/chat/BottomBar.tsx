import type { FC } from "react";
import React, { useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore.ts";
import { MessageThreadContext } from "../editor/MessageThreadProvider.tsx";
import analytics from "../../Analytics.ts";
import { ActionState } from "./ActionState.ts";
import { resolveMentions } from "../../shared/chat-util.ts";
import {
  FaCheck,
  FaRegClipboard,
  FaRegThumbsDown,
  FaRegThumbsUp,
} from "react-icons/fa6";
import type { ExtendedChatMessage } from "./ChatMessageComposite.tsx";
import classNames from "classnames";

export const BottomBar: FC<{
  message: ExtendedChatMessage;
}> = ({ message }) => {
  const { chatHistory, replyInChat, environmentVersion } =
    useApplicationStore();
  const { setToastText, hoveredMessageId } =
    React.useContext(MessageThreadContext);

  const isVisible = hoveredMessageId === message.messageId;

  const onFeedback = (helpful: boolean) => {
    const originalMessage = chatHistory.find(
      (m) => m.messageId === message.replyToMessageId,
    );

    analytics.track("ChatFeedback", {
      architectureId: environmentVersion?.architecture_id,
      environmentId: environmentVersion?.id,
      environmentVersion: environmentVersion?.version,
      messageId: message.messageId,
      messageContent: message.content,
      replyToMessageId: {
        messageId: originalMessage?.messageId,
        content: originalMessage?.content,
      },
      helpful: helpful.toString(),
    });
    replyInChat([], message.messageId, {
      feedbackSubmitted: ActionState.Success,
    });

    setToastText("Thank you for your feedback!");
    setTimeout(() => setToastText(null), 3000);
  };

  const [copied, setCopied] = useState(false);

  const onClickCopyButton = async (e: any) => {
    e.target.blur();
    await navigator.clipboard.writeText(
      message.contentType === "text"
        ? (message.content ?? "")
        : // Resolve mentions to their display text
          resolveMentions(message.content ?? ""),
    );
    setCopied(true);
    e.target.disabled = true;
    setTimeout(() => {
      e.target.disabled = false;
      setCopied(false);
    }, 750);
  };

  return (
    <div
      className={classNames(
        "flex h-2 w-full items-center justify-end gap-1 rounded-lg duration-300 transition-opacity ease-in-out",
        {
          "opacity-0": !isVisible,
          "opacity-100": isVisible,
        },
      )}
    >
      {isVisible && (
        <div className={"flex items-center gap-1"}>
          {message.senderId === "assistant" &&
            (message?.feedbackSubmitted ?? ActionState.Initial) ===
              ActionState.Initial && (
              <>
                <button
                  className="w-fit rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-400"
                  onClick={() => onFeedback(true)}
                >
                  <FaRegThumbsUp size={10} />
                </button>
                <button
                  className="w-fit rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-400"
                  onClick={() => onFeedback(false)}
                >
                  <FaRegThumbsDown size={10} />
                </button>
              </>
            )}
          <button
            className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-400"
            color={"purple"}
            onClick={onClickCopyButton}
          >
            {!copied && <FaRegClipboard size={10} />}
            {copied && (
              <FaCheck
                size={10}
                className="text-green-500 dark:text-green-400"
              />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
