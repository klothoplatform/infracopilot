import type { FC } from "react";
import React, { useState } from "react";
import type {
  ChatMessage,
  InlineImageOptions,
  Mention,
  MentionDisplayOptions,
  MessageProps,
  MessageRenderer,
  MessageThreadStrings,
} from "@azure/communication-react";
import { MessageThreadContext } from "../editor/MessageThreadProvider.tsx";
import useApplicationStore from "../../pages/store/ApplicationStore.ts";
import { analytics } from "../../App.tsx";
import { resolveMentions } from "../../shared/chat-util.ts";
import {
  FaCheck,
  FaRegClipboard,
  FaRegThumbsDown,
  FaRegThumbsUp,
} from "react-icons/fa6";
import { useThemeMode } from "flowbite-react";
import { _formatString } from "@azure/communication-react/dist/dist-esm/acs-ui-common/src";
import type { HTMLReactParserOptions } from "html-react-parser";
import parse, { Element as DOMElement } from "html-react-parser";
import { defaultOnMentionRender } from "@azure/communication-react/dist/dist-esm/react-components/src/components/ChatMessage/MentionRenderer";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vs as lightTheme,
  vscDarkPlus as darkTheme,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import LiveMessage from "@azure/communication-react/dist/dist-esm/react-components/src/components/Announcer/LiveMessage";
import { ActionState } from "./ActionState.ts";
import ReactMarkdown from "react-markdown";
import { twMerge } from "tailwind-merge";
import { DefaultMentionRenderer } from "./MentionRenderer.tsx";
import remarkGfm from "remark-gfm";

import "./markdown.scss";
import { remarkAlert } from "remark-github-blockquote-alert";

export interface ExtendedChatMessage extends ChatMessage {
  feedbackSubmitted?: ActionState;
  explainRequested?: ActionState;
  replyToMessageId?: string;
  environment?: {
    id: string;
    version: number;
  };
}

const BottomBar: FC<{
  message: ExtendedChatMessage;
}> = ({ message }) => {
  const { chatHistory, replyInChat, environmentVersion } =
    useApplicationStore();
  const { setToastText, hoveredMessageId } =
    React.useContext(MessageThreadContext);
  const visible =
    message.status !== "sending" &&
    message.senderId === "assistant" &&
    (hoveredMessageId === message.messageId ||
      chatHistory.at(-1)?.messageId === message.messageId);

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

  function htmlUnescape(str: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, "text/html");
    return doc.documentElement.textContent;
  }

  const onClickCopyButton = async (e: any) => {
    e.target.blur();
    await navigator.clipboard.writeText(
      // Markdown from the server is escaped avoid interfering with mention rendering (and other potential injections vulnerabilities)
      // We need to unescape it before copying it to the clipboard to make it human-readable
      htmlUnescape(
        message.contentType === "text"
          ? (message.content ?? "")
          : // Resolve mentions to their display text
            resolveMentions(message.content ?? ""),
      ) || "",
    );
    setCopied(true);
    e.target.disabled = true;
    setTimeout(() => {
      e.target.disabled = false;
      setCopied(false);
    }, 750);
  };

  return (
    <>
      <div className="absolute -bottom-2.5 right-0 z-10 flex h-[10px] w-fit items-center justify-start gap-1 rounded-lg pb-2 pt-1">
        {visible && (
          <>
            {message.senderId === "assistant" &&
              (message?.feedbackSubmitted ?? ActionState.Initial) ===
                ActionState.Initial && (
                <>
                  <button
                    className="w-full rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-400"
                    onClick={() => onFeedback(true)}
                  >
                    <FaRegThumbsUp size={10} />
                  </button>
                  <button
                    className="w-full rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-400"
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
          </>
        )}
      </div>
    </>
  );
};
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
      onMouseEnter={() => setHoveredMessageId(message.messageId)}
      onMouseLeave={() => {
        if (hoveredMessageId === options.message.messageId) {
          setHoveredMessageId(null);
        }
      }}
    >
      {/*
      Check the default implementation source if any additional functionality is needed:
      https://github.com/Azure/communication-ui-library/blob/main/packages/react-components/src/components/ChatMessage/ChatMessageContent.tsx
      */}
      <MessageContentWithLiveAria
        message={options.message as ChatMessage}
        liveMessage={generateLiveMessage({
          message,
          strings: options.strings,
          theme: mode,
        })}
        content={processHtmlToReact({
          message: options.message as ChatMessage,
          strings: options.strings as MessageThreadStrings,
          theme: mode,
          mentionDisplayOptions: { onRenderMention: DefaultMentionRenderer },
        })}
      />

      <BottomBar message={options.message as ExtendedChatMessage} />
    </div>
  );
};
type MessageContentWithLiveAriaProps = {
  message: ChatMessage;
  liveMessage: string;
  ariaLabel?: string;
  content: React.JSX.Element;
};
const MessageContentWithLiveAria = (
  props: MessageContentWithLiveAriaProps,
): React.JSX.Element => {
  return (
    <div
      data-ui-status={props.message.status}
      role="listitem"
      aria-label={props.ariaLabel}
    >
      <LiveMessage message={props.liveMessage} ariaLive="polite" />
      {props.content}
    </div>
  );
};
type ChatMessageContentProps = {
  message: ChatMessage;
  strings: MessageThreadStrings;
  mentionDisplayOptions?: MentionDisplayOptions;
  inlineImageOptions?: InlineImageOptions;
  theme?: "light" | "dark" | "auto";
};
const processHtmlToReact = (
  props: ChatMessageContentProps,
): React.JSX.Element => {
  const { theme } = props;
  const options: HTMLReactParserOptions = {
    transform(reactNode, domNode) {
      if (domNode instanceof DOMElement && domNode.attribs) {
        // Transform custom rendering of mentions
        if (domNode.name === "msft-mention") {
          const { id } = domNode.attribs;
          const mention: Mention = {
            id: id,
            displayText:
              (domNode.children[0] as unknown as Text).nodeValue ?? "",
          };
          if (props.mentionDisplayOptions?.onRenderMention) {
            return props.mentionDisplayOptions.onRenderMention(
              mention,
              defaultOnMentionRender,
            );
          }
          return defaultOnMentionRender(mention);
        }

        // Transform links to open in new tab
        if (
          domNode.name === "a" &&
          React.isValidElement<React.AnchorHTMLAttributes<HTMLAnchorElement>>(
            reactNode,
          )
        ) {
          return React.cloneElement(reactNode, {
            target: "_blank",
            rel: "noreferrer noopener",
          });
        }
      }
      // Pass through the original node
      const Node = reactNode as unknown as React.JSX.Element;
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkAlert]}
          key={Math.random().toString()}
          className="markdown-renderer"
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                <SyntaxHighlighter
                  style={theme === "light" ? lightTheme : darkTheme}
                  language={match[1] || "text"}
                  PreTag="div"
                  wrapLines={true}
                  wrapLongLines={true}
                  customStyle={{
                    width: "100%",
                    borderRadius: "0.5rem",
                    fontFamily: "monospace",
                    paddingBottom: "0",
                    lineHeight: "1",
                  }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code
                  {...props}
                  className={twMerge(
                    className,
                    "rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700 w-fit overflow-x-clip text-wrap font-mono",
                  )}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {String(Node).replace(/\n$/, "")}
        </ReactMarkdown>
      );
    },
  };

  return <>{parse(props.message.content ?? "", options)}</>;
};
const generateLiveMessage = (props: ChatMessageContentProps): string => {
  const liveAuthor = _formatString(props.strings.liveAuthorIntro, {
    author: `${props.message.senderDisplayName}`,
  });

  return `${props.message.editedOn ? props.strings.editedTag : ""} ${
    props.message.mine ? "" : liveAuthor
  } ${props.message.content} `;
};
