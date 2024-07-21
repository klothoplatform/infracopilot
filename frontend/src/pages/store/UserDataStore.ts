import type { StateCreator } from "zustand";
import { type Architecture } from "../../shared/architecture/Architecture";
import type { ErrorStore } from "./ErrorStore";
import { listArchitectures } from "../../api/ListArchitectures";
import type { AuthStore } from "./AuthStore";

export interface UserStoreState {
  architectures: Architecture[];
}

export interface UserStoreBase extends UserStoreState {
  getArchitectures: (ignoreCache?: boolean) => Promise<Architecture[]>;
  resetUserDataState: () => void;
}

const initialState: () => UserStoreState = () => ({
  architectures: [],
});

export type UserDataStore = UserStoreBase & AuthStore & ErrorStore;

export const userDataStore: StateCreator<
  UserDataStore,
  [],
  [],
  UserStoreBase
> = (set: (state: object, replace?: boolean, id?: string) => any, get) => ({
  ...initialState(),
  getArchitectures: async (ignoreCache) => {
    const cachedArchitectures = get().architectures;
    if (cachedArchitectures.length > 0 && !ignoreCache) {
      return cachedArchitectures;
    }

    const usersArchitectures = await listArchitectures(
      await get().getIdToken(),
    );
    set({ architectures: usersArchitectures }, false, "getArchitectures");
    return usersArchitectures;
  },

  resetUserDataState: () => set(initialState(), false, "resetUserDataState"),
});
