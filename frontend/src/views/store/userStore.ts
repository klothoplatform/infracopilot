import type { StateCreator } from "zustand/esm";
import { type Architecture } from "../../shared/architecture/Architecture";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UserStore {
  idToken: string;
  setIdToken: (idToken: string) => void;
  architectures: Architecture[];
  setArchitectures: (architectures: Architecture[]) => void;
}

export const apiStore: StateCreator<UserStore, [], [], UserStore> = (
  set,
  get,
) => ({
  idToken: "default",
  architectures: [],
  setIdToken: (idToken: string) => set({ idToken }),
  setArchitectures: (architectures: Architecture[]) => set({ architectures }),
});
