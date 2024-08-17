import type { FC } from "react";
import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { ErrorBoundary } from "react-error-boundary";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import { FallbackRenderer } from "../FallbackRenderer";
import useApplicationStore from "../../pages/store/ApplicationStore";
import type { ButtonColors } from "flowbite-react";
import { Button, Toast, Tooltip, useThemeMode } from "flowbite-react";
import type { Mention, MessageThreadStyles } from "@azure/communication-react";
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
import { FaPlus } from "react-icons/fa6";
import { MessageThreadProvider } from "./MessageThreadProvider";
import { ChatMessageComposite } from "../chat/ChatMessageComposite.tsx";
import { Avatar } from "../chat/Avatar.tsx";
import { IsThinkingIndicator } from "../chat/IsThinkingIndicator.tsx";
import { SuggestionItem } from "./SuggestionItem.tsx";
import { DefaultMentionRenderer } from "../chat/MentionRenderer.tsx";
import { FaArrowCircleUp } from "react-icons/fa";
import { PersonaSize } from "@fluentui/react";

const config = resolveConfig(defaultConfig);
const colors = { ...config.theme.colors, primary: config.theme.colors.violet };
const trigger = "@";

const examplePrompts = [
  "Add a lambda function to my architecture",
  "Expose my lambda function as an API",
  "Create a serverless architecture for an e-commerce website",
  "How can I secure my architecture?",
];

const introductionMessage =
  "Hi there! I'm Alfred, your AI assistant, and I can help you update your architecture's topology.\n\nHow can I help you today?";

const ChatSidebar: FC<{
  hidden?: boolean;
}> = ({ hidden }) => {
  const {
    environmentVersion,
    sendChatMessage,
    nodes,
    chatHistory,
    clearChatHistory,
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

  const defaultStyles = {
    backgroundColor: "transparent",
    whiteSpace: "pre-wrap",
    maxWidth: "unset",
    marginTop: "0px",
    paddingBottom: "4px",
  };

  const messageThreadStyles = {
    chatItemMessageContainer: {
      marginTop: "0px",
    },
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
        // ":hover": {
        //   backgroundColor:
        //     mode === "dark" ? colors.gray[900] : colors.gray[100],
        // },
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

  const [showIntro, setShowIntro] = useState(chatHistory.length === 0);
  useEffect(() => {
    setShowIntro(chatHistory.length === 0);
  }, [chatHistory]);
  const introRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={classNames("flex flex-col h-full w-full", {
        hidden: hidden,
      })}
    >
      <div className="flex h-10 w-full items-baseline justify-between border-b p-2 dark:border-gray-700 ">
        <h2 className={"text-md font-medium dark:text-white"}>Chat</h2>
        <Tooltip content={"New Conversation"} placement="bottom">
          <Button size={"xs"} color={mode} onClick={() => clearChatHistory()}>
            <FaPlus />
          </Button>
        </Tooltip>
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
                {showIntro ? (
                  <div
                    ref={introRef}
                    className={classNames(
                      "flex-grow px-4 pb-4 pt-6 overflow-y-auto transition-opacity duration-500 ease-in-out relative flex flex-col justify-around gap-4",
                      {
                        "opacity-0": !showIntro,
                        "opacity-100": showIntro,
                      },
                    )}
                  >
                    <div className={"flex flex-col gap-6"}>
                      <img
                        className="mx-auto mt-4"
                        src="/images/al.svg"
                        alt="Alfred"
                        width="48"
                        height="48"
                      />
                      <p className="text-md my-auto whitespace-pre-wrap text-center font-medium text-gray-600 dark:text-gray-300">
                        {introductionMessage}
                      </p>
                    </div>
                    <div
                      className={classNames(
                        "flex max-w-full flex-wrap overflow-y-clip p-4 gap-2 justify-center transition-opacity duration-1500 ease-in-out",
                        {
                          "opacity-0": !showIntro,
                          "opacity-100": showIntro,
                        },
                      )}
                    >
                      {examplePrompts.map((prompt, index) => (
                        <PromptButton
                          key={index}
                          prompt={prompt}
                          onSend={async (message) => {
                            setIsSubmitting(true);
                            try {
                              await sendChatMessage(message);
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          color={mode}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <MessageThread
                    userId={"user"}
                    styles={messageThreadStyles}
                    strings={{
                      failToSendTag: "Failed",
                    }}
                    onRenderMessage={(options, defaultOnRenderMessage) => (
                      <ChatMessageComposite
                        options={options}
                        defaultOnRenderMessage={defaultOnRenderMessage}
                      />
                    )}
                    showMessageStatus={true}
                    showMessageDate={false}
                    onRenderAvatar={(
                      userId,
                      options,
                      defaultOnRenderAvatar,
                    ) => (
                      <Avatar
                        userId={userId}
                        renderOptions={{ ...options, size: PersonaSize.size24 }}
                        defaultOnRenderAvatar={defaultOnRenderAvatar}
                        renderUserAvatar={false}
                      />
                    )}
                    mentionOptions={{
                      displayOptions: {
                        onRenderMention: (mention, onMentionSelected) => (
                          <DefaultMentionRenderer
                            mention={mention}
                            defaultOnMentionRender={onMentionSelected}
                          />
                        ),
                      },
                      lookupOptions: {
                        trigger,
                        onQueryUpdated: async (query: string) => {
                          const filtered = suggestions.filter((suggestion) =>
                            suggestion.displayText
                              .toLocaleLowerCase()
                              .startsWith(query.toLocaleLowerCase()),
                          );
                          return Promise.resolve(filtered);
                        },
                      },
                    }}
                    disableEditing={true}
                    messages={chatHistory}
                  />
                )}
                <IsThinkingIndicator visible={isSubmitting} />
                {!!toastText && (
                  <Toast className="absolute left-1/2 top-1/2 mx-2 min-h-fit w-fit max-w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden text-center dark:bg-gray-600 dark:text-gray-100">
                    {toastText}
                  </Toast>
                )}
                <div ref={sendBoxRef} className={"justify-self-end px-2"}>
                  <SendBox
                    onRenderIcon={() => <FaArrowCircleUp size={20} />}
                    strings={{
                      placeholderText: showIntro
                        ? "Message Alfred"
                        : "Reply to Alfred",
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
                      ) => (
                        <SuggestionItem
                          key={Math.random().toString()}
                          onSuggestionSelected={onSuggestionSelected}
                          suggestion={suggestion}
                        />
                      ),
                      onQueryUpdated: async (query: string) => {
                        const filtered = suggestions.filter((suggestion) =>
                          suggestion.displayText
                            .toLocaleLowerCase()
                            ?.startsWith(query.toLocaleLowerCase()),
                        );
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

interface PromptButtonProps {
  prompt: string;
  onSend: (message: string) => void;
  color?: keyof ButtonColors;
}

const PromptButton: React.FC<PromptButtonProps> = ({
  prompt,
  onSend,
  color,
}) => {
  const handleClick = () => {
    onSend(prompt);
  };

  return (
    <Button
      size="sm"
      color={color}
      onClick={handleClick}
      className="m-1 text-left"
    >
      {prompt}
    </Button>
  );
};

export default ChatSidebar;
