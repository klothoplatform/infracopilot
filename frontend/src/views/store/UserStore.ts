import type { StateCreator } from "zustand/esm";

export interface UserStore {
  idToken: string;
}

export const apiStore: StateCreator<UserStore, [], [], UserStore> = (
  set,
  get,
) => ({
  idToken: "default",
});
