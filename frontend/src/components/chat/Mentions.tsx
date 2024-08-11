import type { FC } from "react";
import React, { useState } from "react";
import type { Mention } from "@azure/communication-react";
import { Button, useThemeMode } from "flowbite-react";
import { NodeId } from "../../shared/architecture/TopologyNode.ts";
import useApplicationStore from "../../pages/store/ApplicationStore.ts";
import { NodeIcon } from "../../shared/resources/ResourceMappings.tsx";

import { MessageThreadContext } from "../editor/MessageThreadProvider.tsx";

export const ResourceMention: FC<{
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
      className={"inline-block w-fit"}
      title={mention.id.split("#")[1] ?? mention.id}
      onClick={onClick}
    >
      <span className="hover:bg-primary-200 dark:hover:bg-primary-950 flex h-full flex-nowrap items-baseline gap-1 rounded-md px-1">
        <NodeIcon
          provider={resourceId.provider}
          type={resourceId.type}
          className="relative top-0.5 !m-0 size-3.5 p-0"
          variant={mode}
        />
        <span
          className={
            "text-primary-900 dark:text-primary-500 whitespace-nowrap font-semibold"
          }
        >
          {mention.displayText}
        </span>
      </span>
    </button>
  );
};
export const ExplanationMention: FC<{
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
    <div className="flex flex-wrap items-center gap-2 pt-2">
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
