import type { FC, PropsWithChildren } from "react";
import { createContext } from "react";
import React, { useState } from "react";

export interface MessageThreadContextProps {
  toastText: string | null;
  setToastText: React.Dispatch<React.SetStateAction<string | null>>;
  hoveredMessageId: string | null;
  setHoveredMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  submitInProgress: boolean;
  setSubmitInProgress: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MessageThreadContext = createContext<MessageThreadContextProps>({
  toastText: null,
  setToastText: () => {},
  hoveredMessageId: null,
  setHoveredMessageId: () => {},
  submitInProgress: false,
  setSubmitInProgress: () => {},
});

export const MessageThreadProvider: FC<
  PropsWithChildren<Partial<MessageThreadContextProps>>
> = ({ children, ...rest }) => {
  const [toastText, setToastText] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [submitInProgress, setSubmitInProgress] = useState<boolean>(false);
  return (
    <MessageThreadContext.Provider
      value={{
        toastText,
        setToastText,
        hoveredMessageId,
        setHoveredMessageId,
        submitInProgress,
        setSubmitInProgress,
        ...rest,
      }}
    >
      {children}
    </MessageThreadContext.Provider>
  );
};
