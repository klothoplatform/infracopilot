import type { FC } from "react";
import React from "react";
import type { Mention } from "@azure/communication-react";

export const SuggestionItem: FC<{
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
      className="outline-primary-600 hover:bg-primary-200 focus:bg-primary-200 active:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-300 dark:active:bg-primary-300 w-full cursor-default px-2 focus:ring-0"
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
