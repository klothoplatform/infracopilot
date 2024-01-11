import type { StateCreator } from "zustand/esm";
import { v4 as uuidv4 } from "uuid";
import { analytics } from "../../App";
import type { ApplicationError } from "../../shared/errors";
import { ErrorType } from "../../shared/errors";
import { env } from "../../shared/environment";
import { isObject } from "../../shared/object-util";

export interface ErrorStore {
  errors: ApplicationError[];
  addError: (error: Error) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

export const errorStore: StateCreator<ErrorStore, [], [], ErrorStore> = (
  set: (state: object, replace?: boolean, id?: string) => any,
  get,
) => ({
  errors: [],
  addError: (error: Error) => {
    const errs = [];
    for (let c = error; c; c = c.cause as Error) {
      errs.push(c);
    }
    console.error("addError", errs);
    fillError(error);
    set(
      { errors: [...get().errors, error as ApplicationError] },
      false,
      "addError",
    );
    trackError(error as ApplicationError);
  },
  clearErrors: () => set({ errors: [] }, false, "clearErrors"),
  removeError: (id: string) =>
    set(
      { errors: get().errors.filter((e) => e.id !== id) },
      false,
      "removeError",
    ),
});

export function trackError(error: Partial<ApplicationError>) {
  fillError(error);
  console.error(error);
  if (!env.analytics.trackErrors) {
    return;
  }
  const payload = {
    ...error,
    message: error.message,
    name: error.name,
    stack: error.stack,
    environment: env.environment,
    cause: error.cause && {
      message: (error.cause as Error)?.message,
      name: (error.cause as Error)?.name,
      id: (error.cause as ApplicationError)?.id,
    },
  };
  // messageComponent is not meant to be sent to analytics
  delete payload.messageComponent;
  analytics?.track(error.name ?? ErrorType.UNKNOWN, payload);
}

function fillError(error: Partial<ApplicationError>): void {
  if (!isObject(error)) {
    return;
  }

  if (!error.id) {
    error.id = uuidv4().toString();
  }
  if (!error.name || error.name === "Error") {
    error.name = ErrorType.UNKNOWN;
  }
  if (!error.errorId) {
    error.errorId = "UNKNOWN";
  }
  if (!error.message) {
    error.message = "Something went wrong!";
  }
}
