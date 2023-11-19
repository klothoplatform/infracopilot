import type { StateCreator } from "zustand/esm";
import { v4 as uuidv4 } from "uuid";

export interface ApplicationError {
  id: string;
  message?: string;
}

export interface ErrorStore {
  errors: ApplicationError[];
  addError: (message: string) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

export const errorStore: StateCreator<ErrorStore, [], [], ErrorStore> = (
  set,
  get,
) => ({
  errors: [],
  addError: (message: string) => {
    const id = uuidv4().toString();
    set({ errors: [...get().errors, { id, message }] });
  },
  removeError: (id: string) =>
    set({ errors: get().errors.filter((e) => e.id !== id) }),
  clearErrors: () => set({ errors: [] }),
});
