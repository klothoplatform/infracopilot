import type { FC } from "react";
import React, { useEffect, useState } from "react";
import { Button, Toast } from "flowbite-react";
import classNames from "classnames";
import useApplicationStore from "../pages/store/ApplicationStore";
import { HiExclamationCircle } from "react-icons/hi";
import type { ApplicationError } from "../pages/store/ErrorStore";

export const ErrorOverlay: FC = () => {
  const { errors, removeError, clearErrors } = useApplicationStore();

  const [currentErrors, setCurrentErrors] = useState(errors.slice(0, 5));
  const [shouldRefresh, setShouldRefresh] = useState(true);

  useEffect(() => {
    if (errors.length !== currentErrors.length && currentErrors.length < 5)
      setShouldRefresh(true);
  }, [errors, currentErrors, setShouldRefresh]);

  useEffect(() => {
    if (shouldRefresh) {
      setCurrentErrors(errors.slice(0, 5));
      setShouldRefresh(false);
    }
  }, [currentErrors, errors, setCurrentErrors, shouldRefresh]);

  const onRemove = (id: string) => {
    removeError(id);
    setShouldRefresh(true);
  };

  return (
    <div
      className={classNames("fixed inset-0 z-[1001] pointer-events-none p-2", {
        hidden: !errors.length,
      })}
    >
      <div
        className={classNames(
          "mx-auto mt-24 flex h-fit max-h-[50vh] w-fit flex-col justify-start gap-1 overflow-y-auto p-2 rounded bg-gray-100/95 p-2 drop-shadow-lg border-[1px] border-gray-300 dark:bg-gray-900/95 dark:border-gray-700",
        )}
      >
        {currentErrors.map((error) => (
          <ErrorToast key={error.id} error={error} onRemove={onRemove} />
        ))}
        {currentErrors.length > 1 && (
          <Button
            color="light"
            size={"xs"}
            outline
            className="pointer-events-auto mt-1 self-end"
            onClick={() => {
              clearErrors();
              setShouldRefresh(true);
            }}
          >
            clear
          </Button>
        )}
      </div>
    </div>
  );
};

const ErrorToast: FC<{
  error: ApplicationError;
  onRemove: (id: string) => void;
}> = ({ error, onRemove }) => {
  return (
    <Toast className="pointer-events-auto rounded-lg p-2">
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
        <HiExclamationCircle className="h-5 w-5" />
      </div>
      <div className="ml-3 text-sm font-normal">{error.message}</div>
      <Toast.Toggle
        onClick={() => {
          onRemove(error.id);
        }}
      />
    </Toast>
  );
};
