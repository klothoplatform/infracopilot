import type { FC } from "react";
import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { ErrorBoundary } from "react-error-boundary";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import { FallbackRenderer } from "../FallbackRenderer";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { Toast } from "flowbite-react";
import { Button, useThemeMode } from "flowbite-react";
import type {
  ChatMessage,
  CustomAvatarOptions,
  Mention,
  MessageProps,
  MessageRenderer,
  MessageThreadStyles,
} from "@azure/communication-react";
import {
  FluentThemeProvider,
  MessageThread,
  SendBox,
} from "@azure/communication-react";
import { NodeIcon } from "../../shared/resources/ResourceMappings";
import resolveConfig from "tailwindcss/resolveConfig";
import defaultConfig from "tailwindcss/defaultConfig";
import {
  chatThemeDark,
  chatThemeLight,
  fontFamily,
} from "../../fluentui-themes";
import "./ChatSidebar.scss";
import { NodeId } from "../../shared/architecture/TopologyNode";

import { Persona, PersonaSize } from "@fluentui/react";
import {
  FaCheck,
  FaRegClipboard,
  FaRegThumbsDown,
  FaRegThumbsUp,
} from "react-icons/fa6";
import { analytics } from "../../App";
import {
  MessageThreadContext,
  MessageThreadProvider,
} from "./MessageThreadProvider";

export enum MentionType {
  Resource = "resource",
  Explain = "explain",
}

const config = resolveConfig(defaultConfig);
const colors = { ...config.theme.colors, primary: config.theme.colors.violet };
const trigger = "@";

export const ChatSidebar: FC<{
  hidden?: boolean;
}> = ({ hidden }) => {
  const {
    environmentVersion,
    sendChatMessage,
    nodes,
    chatHistory,
    replyInChat,
  } = useApplicationStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mode } = useThemeMode();
  const suggestions: Mention[] = nodes.map((node) => {
    return {
      displayText: node.data.resourceId.name,
      id: `resource#${node.data.resourceId.toString()}`,
      icon: (
        <NodeIcon
          key={Math.random().toString()}
          provider={node.data.resourceId.provider}
          type={node.data.resourceId.type}
          variant={mode}
          className="size-4"
        />
      ),
    };
  });

  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const sendBoxRef = React.useRef<HTMLDivElement>(null);
  const delayForSendButton = 300;

  useEffect(() => {
    if (sendBoxRef.current) {
      !isSubmitting &&
        sendBoxRef.current.getElementsByTagName("textarea")[0]?.focus();
    }
  }, [isSubmitting]);

  useEffect(() => {
    return () => {
      timeoutRef.current && clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (chatHistory.length < 1) {
      replyInChat([
        {
          messageId: "intro", // fixed id ensures this message is not duplicated on re-render (mostly for strict mode)
          content:
            "Hi there! I'm Alfred, your AI assistant, and I can help you update your architecture's topology.\n\nHow can I help you today?",
        },
      ]);
    }
  }, [chatHistory, replyInChat]);

  const defaultStyles = {
    backgroundColor: "transparent",
    whiteSpace: "pre-wrap",
    maxWidth: "unset",
    marginTop: "0px",
    paddingBottom: "4px",
  };

  const messageThreadStyles = {
    chatContainer: {
      "& *": {
        fontFamily,
      },
      paddingLeft: "0px",
      paddingRight: "0px",
      "> div": {
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
        paddingBottom: "0.75rem",
        ":hover": {
          backgroundColor:
            mode === "dark" ? colors.gray[900] : colors.gray[100],
        },
      },
    },
    newMessageButtonContainer: {
      "& span": {
        fontWeight: "normal",
      },
      "& button": {
        padding: "0.5rem .5rem",
        backgroundColor:
          mode === "dark" ? colors.primary[700] : colors.primary[600],
        color: "white",
        borderRadius: "0.5rem",
        borderColor: "transparent",
        ":hover": {
          backgroundColor:
            mode === "dark" ? colors.primary[600] : colors.primary[700],
          color: "white",
        },
      },
    },
    chatMessageContainer: {
      ...defaultStyles,
    },
    myChatMessageContainer: {
      ...defaultStyles,
    },
    failedMyChatMessageContainer: {
      ...defaultStyles,
    },
  } satisfies MessageThreadStyles;

  const [toastText, setToastText] = useState<string | null>(null);

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
        <div
          className={classNames(
            "flex h-full flex-col justify-end gap-4 overflow-hidden dark:text-gray-200",
            {
              "z-[1500]": isSubmitting,
            },
          )}
        >
          <MessageThreadProvider
            {...{ toastText, setToastText }}
            submitInProgress={isSubmitting}
            setSubmitInProgress={setIsSubmitting}
          >
            <FluentThemeProvider
              fluentTheme={mode === "dark" ? chatThemeDark : chatThemeLight}
            >
              <div className="relative flex size-full flex-col pb-4">
                <MessageThread
                  userId={"user"}
                  styles={messageThreadStyles}
                  strings={{
                    failToSendTag: "Failed",
                  }}
                  onRenderMessage={(options, defaultOnRenderMessage) => {
                    return (
                      <ChatMessageComposite
                        options={options}
                        defaultOnRenderMessage={defaultOnRenderMessage}
                      />
                    );
                  }}
                  showMessageStatus={true}
                  onRenderAvatar={(userId, options, defaultOnRenderAvatar) => {
                    return (
                      <Avatar
                        userId={userId}
                        renderOptions={options}
                        defaultOnRenderAvatar={defaultOnRenderAvatar}
                      />
                    );
                  }}
                  mentionOptions={{
                    displayOptions: {
                      onRenderMention: (mention, defaultOnMentionRender) => {
                        let [type, id]: [MentionType, string] =
                          mention.id.split("#") as any;

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
                      },
                    },
                    lookupOptions: {
                      trigger,
                      onQueryUpdated: async (query: string) => {
                        const filtered = suggestions.filter((suggestion) => {
                          return suggestion.displayText
                            .toLocaleLowerCase()
                            .startsWith(query.toLocaleLowerCase());
                        });
                        return Promise.resolve(filtered);
                      },
                    },
                  }}
                  disableEditing={true}
                  messages={chatHistory}
                />
                <IsThinkingIndicator visible={isSubmitting} />
                {!!toastText && (
                  <Toast className="absolute left-1/2 top-1/2 mx-2 min-h-fit w-fit max-w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden text-center dark:bg-gray-600 dark:text-gray-100">
                    {toastText}
                  </Toast>
                )}

                <div ref={sendBoxRef} className={"justify-self-end px-2"}>
                  <SendBox
                    strings={{
                      placeholderText: "Talk to Alfred",
                    }}
                    disabled={isSubmitting}
                    supportNewline
                    onSendMessage={async (message) => {
                      timeoutRef.current = setTimeout(async () => {
                        if (!environmentVersion) {
                          return;
                        }

                        setIsSubmitting(true);
                        try {
                          await sendChatMessage(message);
                        } catch (e: any) {
                          throw new UIError({
                            message: "Failed to send chat message",
                            errorId: "ChatSend",
                            cause: e,
                          });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }, delayForSendButton);
                    }}
                    mentionLookupOptions={{
                      trigger,
                      onRenderSuggestionItem: (
                        suggestion,
                        onSuggestionSelected,
                      ) => {
                        return (
                          <SuggestionItem
                            key={Math.random().toString()}
                            onSuggestionSelected={onSuggestionSelected}
                            suggestion={suggestion}
                          />
                        );
                      },
                      onQueryUpdated: async (query: string) => {
                        const filtered = suggestions.filter((suggestion) => {
                          return suggestion.displayText
                            .toLocaleLowerCase()
                            ?.startsWith(query.toLocaleLowerCase());
                        });
                        return Promise.resolve(filtered);
                      },
                    }}
                  />
                </div>
              </div>
            </FluentThemeProvider>
          </MessageThreadProvider>
        </div>
        {isSubmitting && (
          <div
            className={
              "fixed inset-0 z-[1000] flex size-full flex-col items-center justify-center bg-gray-500/20 dark:bg-black/20"
            }
          >
            &nbsp;
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
};

const IsThinkingIndicator: FC<{ visible?: boolean }> = ({ visible }) => {
  return (
    <div className="flex items-baseline gap-1 px-4 py-1">
      {visible && (
        <>
          <span className="font-semibold text-primary-900 dark:text-primary-500">
            Alfred
          </span>
          <span className="text-gray-500 dark:text-gray-400">is thinking</span>
          <div className="flex items-center justify-center gap-0.5">
            <div className="size-1 animate-pulse rounded-full bg-gray-500 [animation-delay:-0.3s] dark:bg-gray-400"></div>
            <div className="size-1 animate-pulse rounded-full bg-gray-500 [animation-delay:-0.15s] dark:bg-gray-400"></div>
            <div className="size-1 animate-pulse rounded-full bg-gray-500 dark:bg-gray-400"></div>
          </div>
        </>
      )}
      {!visible && <span>&nbsp;</span>}
    </div>
  );
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
    <button title={mention.id.split("#")[1] ?? mention.id} onClick={onClick}>
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

  if (hidden || !isLastMessage || !message || message.senderId !== "system") {
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

const SuggestionItem: FC<{
  onSuggestionSelected: (suggestion: Mention) => void;
  suggestion: Mention;
}> = ({ onSuggestionSelected, suggestion }) => {
  const onClick = () => onSuggestionSelected(suggestion);
  const onKeyDown = (event: any) => {
    event.preventDefault();
    if (event.key === "Enter" || event.key === " ") {
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="w-full cursor-default px-2 outline-primary-600 hover:bg-primary-200 focus:bg-primary-200 focus:ring-0 active:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-300 dark:active:bg-primary-300"
      onClick={() => onSuggestionSelected(suggestion)}
      onKeyDown={onKeyDown}
    >
      <div
        data-ui-id="mention-suggestion-item"
        data-is-focusable="true"
        className="flex w-full items-center justify-start gap-4"
      >
        {suggestion.icon}
        <span>{suggestion.displayText}</span>
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

interface AvatarProps {
  userId?: string;
  renderOptions?: CustomAvatarOptions;
  defaultOnRenderAvatar?: (options: CustomAvatarOptions) => React.JSX.Element;
}

const Avatar: React.FC<AvatarProps> = ({
  userId,
  renderOptions,
  defaultOnRenderAvatar,
}) => {
  const { user } = useApplicationStore();
  const { mode } = useThemeMode();
  if (userId === "system") {
    return (
      <Persona
        size={PersonaSize.size32}
        hidePersonaDetails
        text={"Alfred"}
        imageUrl={`/images/alfred-avatar-${mode}.png`}
        showOverflowTooltip={false}
      />
    );
  }

  if (userId === "user") {
    return (
      <Persona
        size={PersonaSize.size32}
        hidePersonaDetails
        text={
          user?.displayName ||
          user?.name ||
          user?.nickname ||
          user?.preferred_username ||
          user?.given_name ||
          "User"
        }
        imageUrl={user?.picture}
        showOverflowTooltip={false}
      />
    );
  }

  return defaultOnRenderAvatar && renderOptions ? (
    defaultOnRenderAvatar(renderOptions)
  ) : (
    <></>
  );
};

function resolveMentions(text: string) {
  return text
    .replace(/<msft-mention id="resource#.*?">(.*?)<\/msft-mention>/g, "$1")
    .replace(/<msft-mention id="explain#.*?">(.*?)<\/msft-mention>/g, "")
    .trim();
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
    message.senderId === "system" &&
    (hoveredMessageId === message.messageId ||
      chatHistory.at(-1)?.messageId === message.messageId);

  const onFeedback = (helpful: boolean) => {
    analytics.track("ChatFeedback", {
      architectureId: environmentVersion?.architecture_id,
      environmentId: environmentVersion?.id,
      environmentVersion: environmentVersion?.version,
      messageId: message.messageId,
      messageContent: message.content,
      replyToMessageId: chatHistory.find(
        (m) => m.messageId === message.replyToMessageId,
      ),
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
        ? message.content ?? ""
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
            {message.senderId === "system" &&
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

const ChatMessageComposite: FC<{
  options: MessageProps;
  defaultOnRenderMessage?: MessageRenderer;
}> = ({ options, defaultOnRenderMessage }) => {
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
      {defaultOnRenderMessage && options
        ? defaultOnRenderMessage(options)
        : null}
      <BottomBar message={options.message as ExtendedChatMessage} />
    </div>
  );
};
