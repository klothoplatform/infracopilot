import type {
  ChatMessage,
  InlineImageOptions,
  Mention,
  MentionDisplayOptions,
  MessageThreadStrings,
} from "@azure/communication-react";
import type { FC } from "react";
import React, { useState } from "react";
import classNames from "classnames";
import { _formatString } from "@azure/communication-react/dist/dist-esm/acs-ui-common/src";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkMention from "../../shared/remark-mention.ts";
import { DefaultMentionRenderer } from "./MentionRenderer.tsx";
import HoverableLink from "./HoverableLink.tsx";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vs as lightTheme,
  vscDarkPlus as darkTheme,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { twMerge } from "tailwind-merge";
import LiveMessage from "@azure/communication-react/dist/dist-esm/react-components/src/components/Announcer/LiveMessage";
import type { ExtendedChatMessage } from "./ChatMessageComposite.tsx";
import remarkCodeTitle from "remark-code-title";
import { CopyToClipboardButton } from "../CopyToClipboardButton.tsx";

export function AssistantMessage(props: {
  message: ExtendedChatMessage;
  strings: MessageThreadStrings;
  theme: "light" | "dark" | "auto";
  onRenderMention: (
    mention: Mention,
    defaultOnRender: (mention: Mention) => React.ReactElement,
  ) => React.ReactElement;
}) {
  /*
    Check the default implementation source if any additional functionality is required:
    https://github.com/Azure/communication-ui-library/blob/main/packages/react-components/src/components/ChatMessage/ChatMessageContent.tsx
    */
  return (
    <MessageContentWithLiveAria
      message={props.message}
      liveMessage={generateLiveMessage({
        message: props.message,
        strings: props.strings,
        theme: props.theme,
      })}
      content={renderMarkdown({
        message: props.message,
        strings: props.strings as MessageThreadStrings,
        theme: props.theme,
        mentionDisplayOptions: {
          onRenderMention: props.onRenderMention,
        },
      })}
    />
  );
}

type MessageContentWithLiveAriaProps = {
  message: ChatMessage;
  liveMessage: string;
  ariaLabel?: string;
  content: React.ReactElement;
};
const MessageContentWithLiveAria = (
  props: MessageContentWithLiveAriaProps,
): React.ReactElement => {
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
const renderMarkdown = (props: ChatMessageContentProps): React.ReactElement => {
  const { theme } = props;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkAlert, remarkMention, remarkCodeTitle]}
      key={Math.random().toString()}
      className="markdown-renderer"
      components={{
        div({ children, ...props }) {
          const { mentionId, mentionType } = props as any;
          if (!mentionType) {
            return <span {...props}>{children}</span>;
          }
          return (
            <DefaultMentionRenderer
              mention={{
                id: `${mentionType}#${mentionId}`,
                displayText: String(children),
              }}
              defaultOnMentionRender={() => <div {...props}>{children}</div>}
            />
          );
        },
        img({ src, alt, ...props }) {
          return (
            <HoverableLink href={src}>
              <img
                src={src}
                alt={alt}
                {...props}
                className="h-auto max-w-full rounded-lg"
              />
            </HoverableLink>
          );
        },
        a({ href, children, ...props }) {
          return (
            <HoverableLink href={href}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                {...props}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {children}
              </a>
            </HoverableLink>
          );
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <CodeBlockWithCopyButton
              language={match[1] || "text"}
              theme={theme}
              code={String(children).replace(/\n$/, "")}
            />
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
      {(props.message.content || "").replace(/\n$/, "")}
    </ReactMarkdown>
  );
};
const generateLiveMessage = (props: ChatMessageContentProps): string => {
  const liveAuthor = _formatString(props.strings.liveAuthorIntro, {
    author: `${props.message.senderDisplayName}`,
  });

  return `${props.message.editedOn ? props.strings.editedTag : ""} ${
    props.message.mine ? "" : liveAuthor
  } ${props.message.content} `;
};

type CodeBlockWithCopyButtonProps = {
  language: string;
  theme?: "light" | "dark" | "auto";
  code: string;
};

const CodeBlockWithCopyButton: FC<CodeBlockWithCopyButtonProps> = ({
  language,
  theme,
  code,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      <div
        className={classNames(
          "absolute right-2 top-2 float-right transition-opacity duration-300 ease-in-out",
          {
            "opacity-0": !isHovered,
            "opacity-100": isHovered,
          },
        )}
      >
        {isHovered && (
          <CopyToClipboardButton text={code} size="xs" color={theme} />
        )}
      </div>
      <SyntaxHighlighter
        style={theme === "light" ? lightTheme : darkTheme}
        language={language}
        PreTag="div"
        wrapLines={true}
        wrapLongLines={true}
        customStyle={{
          width: "100%",
          borderRadius: /title="[^"]+"/.test(code.split("\n")[0])
            ? "0.5rem"
            : "0",
          borderBottomLeftRadius: "0.5rem",
          borderBottomRightRadius: "0.5rem",
          fontFamily: "monospace",
          lineHeight: "1",
          marginTop: "0",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
