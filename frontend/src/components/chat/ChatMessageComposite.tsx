import type { FC } from "react";
import React from "react";
import type {
  ChatMessage,
  MessageProps,
  MessageRenderer,
} from "@azure/communication-react";
import { useThemeMode } from "flowbite-react";
import type { ActionState } from "./ActionState.ts";
import { DefaultMentionRenderer } from "./MentionRenderer.tsx";

import "./markdown.scss";
import { MessageThreadContext } from "../editor/MessageThreadProvider.tsx";
import { UserMessage } from "./UserMessage.tsx";
import { BottomBar } from "./BottomBar.tsx";
import { AssistantMessage } from "./AssistantMessage.tsx";
import classNames from "classnames";

export interface ExtendedChatMessage extends ChatMessage {
  feedbackSubmitted?: ActionState;
  explainRequested?: ActionState;
  replyToMessageId?: string;
  environment?: {
    id: string;
    version: number;
  };
}

export const ChatMessageComposite: FC<{
  options: MessageProps;
  defaultOnRenderMessage?: MessageRenderer;
}> = ({ options }) => {
  const message = options.message as ExtendedChatMessage;
  const { hoveredMessageId, setHoveredMessageId } =
    React.useContext(MessageThreadContext);
  const { mode } = useThemeMode();

  return (
    <div
      className="chat-message-composite flex w-full flex-col"
      onMouseEnter={() => {
        setHoveredMessageId(message.messageId);
      }}
      onMouseLeave={() => {
        if (hoveredMessageId === options.message.messageId) {
          setHoveredMessageId(null);
        }
      }}
      onFocus={() => setHoveredMessageId(message.messageId)}
      onBlur={() => {
        if (hoveredMessageId === options.message.messageId) {
          setHoveredMessageId(null);
        }
      }}
    >
      <div
        className={classNames("flex w-full flex-col items-end", {
          "gap-2": message.senderId !== "assistant",
        })}
      >
        {message.senderId === "assistant" ? (
          <div className="w-full">
            <AssistantMessage
              message={message}
              strings={options.strings}
              theme={mode}
              onRenderMention={(mention, defaultOnRender) => (
                <DefaultMentionRenderer
                  mention={mention}
                  defaultOnMentionRender={defaultOnRender}
                />
              )}
            />
          </div>
        ) : (
          <UserMessage
            options={{ ...options, showDisplayName: false }}
            onRenderContent={() => message.content || ""}
          />
        )}
        <BottomBar message={message} />
      </div>
    </div>
  );
};
