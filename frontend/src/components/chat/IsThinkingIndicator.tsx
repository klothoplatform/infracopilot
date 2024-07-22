import type { FC } from "react";
import React from "react";

export const IsThinkingIndicator: FC<{ visible?: boolean }> = ({ visible }) => {
  return (
    <div className="flex items-baseline gap-1 px-4 py-1">
      {visible && (
        <>
          <span className="text-primary-900 dark:text-primary-500 font-semibold">
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
