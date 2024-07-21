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
import { Button, useThemeMode } from "flowbite-react";
import { NodeId } from "../../shared/architecture/TopologyNode.ts";
import { NodeIcon } from "../../shared/resources/ResourceMappings.tsx";
import { _formatString } from "@azure/communication-react/dist/dist-esm/acs-ui-common/src";
import type { HTMLReactParserOptions } from "html-react-parser";
import parse, { Element as DOMElement } from "html-react-parser";
import { defaultOnMentionRender } from "@azure/communication-react/dist/dist-esm/react-components/src/components/ChatMessage/MentionRenderer";
import { MarkdownCodeWrapper } from "./MarkdownCodeWrapper.tsx";
import { LinkifyMarkdown } from "./LinkifyMarkdown.tsx";
import LiveMessage from "@azure/communication-react/dist/dist-esm/react-components/src/components/Announcer/LiveMessage";

export enum MentionType {
  Resource = "resource",
  Explain = "explain",
}

export const onRenderMention = (mention, defaultOnMentionRender) => {
  let [type, id]: [MentionType, string] = mention.id.split("#") as any;

  const MentionComponent = mentionMappings[type];
  if (MentionComponent) {
    return (
      <MentionComponent
        key={Math.random().toString()}
        mention={mention}
        id={id}
      />
    );
  }
  return defaultOnMentionRender(mention);
};
const ResourceMention: FC<{
  mention: Mention;
  id: string;
}> = ({ mention, id }) => {
  const { mode } = useThemeMode();
  const resourceId = NodeId.parse(id);
  const { selectResource } = useApplicationStore();

  const onClick = () => {
    selectResource(resourceId, true);
  };

  return (
    <button
      className={"inline-block  w-fit"}
      title={mention.id.split("#")[1] ?? mention.id}
      onClick={onClick}
    >
      <div className="flex h-full flex-nowrap items-baseline gap-1 rounded-md px-1 hover:bg-primary-200 dark:hover:bg-primary-950">
        <NodeIcon
          provider={resourceId.provider}
          type={resourceId.type}
          width={14}
          height={14}
          className="my-auto p-0"
          variant={mode}
        />
        <span
          className={
            "whitespace-nowrap font-semibold text-primary-900 dark:text-primary-500"
          }
        >
          {mention.displayText}
        </span>
      </div>
    </button>
  );
};
const ExplanationMention: FC<{
  mention: Mention;
}> = ({ mention }) => {
  const messageId = mention.id.split("#")[1];
  const { setSubmitInProgress, submitInProgress } =
    React.useContext(MessageThreadContext);
  const { mode } = useThemeMode();
  const { environmentVersion, explainDiff, chatHistory } =
    useApplicationStore();
  const [hidden, setHidden] = useState(false);

  const message = chatHistory.find((m) => m.messageId === messageId);
  const isLastMessage = chatHistory.at(-1)?.messageId === messageId;

  const onClickNo = () => {
    setHidden(true);
  };

  const onClickYes = async () => {
    try {
      setSubmitInProgress(true);
      setHidden(true);
      await explainDiff(environmentVersion.diff);
    } finally {
      setSubmitInProgress(false);
    }
  };

  if (
    hidden ||
    !isLastMessage ||
    !message ||
    message.senderId !== "assistant"
  ) {
    return <></>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span
        className={"text-xs font-semibold text-gray-900 dark:text-gray-500"}
      >
        Should I explain in detail?
      </span>
      <div className="flex items-center gap-2">
        <Button
          size={"xs"}
          color={mode}
          onClick={onClickYes}
          className={"size-fit whitespace-nowrap text-xs"}
          disabled={submitInProgress}
        >
          Yes
        </Button>
        <Button
          size={"xs"}
          color={mode}
          onClick={onClickNo}
          className={"size-fit whitespace-nowrap text-xs"}
        >
          No
        </Button>
      </div>
    </div>
  );
};

export function mention(type: MentionType, id: string, displayText: string) {
  return `<msft-mention id="${type}#${id}">${displayText}</msft-mention>`;
}

export enum ActionState {
  Initial,
  InProgress,
  Success,
  Failure,
}

export interface ExtendedChatMessage extends ChatMessage {
  feedbackSubmitted?: ActionState;
  explainRequested?: ActionState;
  replyToMessageId?: string;
  environment?: {
    id: string;
    version: number;
  };
}

export const mentionMappings: Record<MentionType, React.FC<any>> = {
  [MentionType.Resource]: ResourceMention,
  [MentionType.Explain]: ExplanationMention,
};
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

  const onClickCopyButton = async (e: any) => {
    e.target.blur();
    await navigator.clipboard.writeText(
      message.contentType === "text"
        ? (message.content ?? "")
        : resolveMentions(message.content ?? ""),
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
}> = ({ options, defaultOnRenderMessage }) => {
  const DefaultContent = defaultOnRenderMessage || (() => <></>);
  const message = options.message as ExtendedChatMessage;
  const { hoveredMessageId, setHoveredMessageId } =
    React.useContext(MessageThreadContext);
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
        liveMessage={generateLiveMessage({ message, strings: options.strings })}
        content={processHtmlToReact({
          message: options.message as ChatMessage,
          strings: options.strings as MessageThreadStrings,
          mentionDisplayOptions: { onRenderMention },
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
      role="text"
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
};
const processHtmlToReact = (
  props: ChatMessageContentProps,
): React.JSX.Element => {
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
      return <MarkdownCodeWrapper>{Node}</MarkdownCodeWrapper>;
    },
  };
  console.log(props.message.content);

  return (
    <LinkifyMarkdown>
      {parse(props.message.content ?? "", options)}
    </LinkifyMarkdown>
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
