import type { FC } from "react";
import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { ErrorBoundary } from "react-error-boundary";
import { trackError } from "../../pages/store/ErrorStore";
import { UIError } from "../../shared/errors";
import { FallbackRenderer } from "../FallbackRenderer";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { useThemeMode } from "flowbite-react";
import type { Mention, MessageThreadStyles } from "@azure/communication-react";
import {
  FluentThemeProvider,
  MessageThread,
  SendBox,
} from "@azure/communication-react";
import { NodeIcon } from "../../shared/resources/ResourceMappings";
import resolveConfig from "tailwindcss/resolveConfig";
import defaultConfig from "tailwindcss/defaultConfig";
import { chatThemeDark, chatThemeLight } from "../../fluentui-themes";
import "./ChatSidebar.scss";
import { NodeId } from "../../shared/architecture/TopologyNode";
import {
  RightSidebarDetailsTab,
  RightSidebarMenu,
} from "../../shared/sidebar-nav";

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
    selectResource,
    chatHistory,
    navigateRightSidebar,
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

  const messageThreadStyles = {
    chatMessageContainer: {
      whiteSpace: "pre-wrap",
      border: "1px solid",
      backgroundColor: mode === "dark" ? colors.gray[900] : colors.primary[100],
      borderColor: mode === "dark" ? colors.primary[800] : colors.primary[300],
      borderRadius: "0.5rem",
    },
    myChatMessageContainer: {
      backgroundColor: mode === "dark" ? colors.gray[900] : colors.blue[100],
      whiteSpace: "pre-wrap",
      border: "1px solid",
      borderColor: mode === "dark" ? colors.blue[800] : colors.blue[300],
      borderRadius: "0.5rem",
    },
    failedMyChatMessageContainer: {
      backgroundColor: mode === "dark" ? colors.gray[900] : colors.red[100],
      whiteSpace: "pre-wrap",
      border: "1px solid",
      borderColor: mode === "dark" ? colors.red[800] : colors.red[300],
      borderRadius: "0.5rem",
    },
  } satisfies MessageThreadStyles;

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
          <FluentThemeProvider
            fluentTheme={mode === "dark" ? chatThemeDark : chatThemeLight}
          >
            <div className="flex size-full flex-col pb-4">
              <MessageThread
                userId={"user"}
                showMessageDate={true}
                showMessageStatus={true}
                styles={messageThreadStyles}
                strings={{
                  failToSendTag: "Failed",
                }}
                mentionOptions={{
                  displayOptions: {
                    onRenderMention: (mention, defaultOnMentionRender) => {
                      const id = NodeId.parse(mention.id.split("#")[1] ?? ""); // strip type prefix (e.g. "resource#")
                      const onClick = () => {
                        selectResource(id);
                        navigateRightSidebar([
                          RightSidebarMenu.Details,
                          RightSidebarDetailsTab.Config,
                        ]);
                      };

                      return (
                        <button
                          key={Math.random().toString()}
                          onClick={onClick}
                        >
                          <div className="flex h-full items-baseline gap-1 rounded-md px-1 hover:bg-primary-200">
                            <NodeIcon
                              provider={id.provider}
                              type={id.type}
                              width={14}
                              height={14}
                              className="my-auto p-0"
                              variant={mode}
                            />
                            <span
                              className={
                                "font-semibold text-primary-900 dark:text-primary-500"
                              }
                            >
                              {mention.displayText}
                            </span>
                          </div>
                        </button>
                      );
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
              {isSubmitting && <IsThinkingIndicator />}
              <div ref={sendBoxRef} className={"justify-self-end px-2"}>
                <SendBox
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
                      const onClick = () => onSuggestionSelected(suggestion);
                      const onKeyDown = (event: any) => {
                        event.preventDefault();
                        if (event.key === "Enter" || event.key === " ") {
                          onClick();
                        }
                      };

                      return (
                        <div
                          key={Math.random().toString()}
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

const IsThinkingIndicator: FC = () => {
  return (
    <div className="flex items-baseline gap-1 px-4 py-1">
      <span className="font-semibold text-primary-900 dark:text-primary-500">
        Alfred
      </span>
      <span className="text-gray-500 dark:text-gray-400">is thinking</span>
      <div className="flex items-center justify-center gap-0.5">
        <div className="size-1 animate-pulse rounded-full bg-gray-500 [animation-delay:-0.3s] dark:bg-gray-400"></div>
        <div className="size-1 animate-pulse rounded-full bg-gray-500 [animation-delay:-0.15s] dark:bg-gray-400"></div>
        <div className="size-1 animate-pulse rounded-full bg-gray-500 dark:bg-gray-400"></div>
      </div>
    </div>
  );
};
