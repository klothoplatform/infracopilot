import type { StoreApi, UseBoundStore } from "zustand";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import type { EditorStore } from "./EditorStore";
import { editorStore } from "./EditorStore";
import type { AuthStore } from "./AuthStore";
import { authStore } from "./AuthStore";
import { devtools, persist } from "zustand/middleware";
import type { ErrorStore } from "./ErrorStore";
import { errorStore } from "./ErrorStore";
import type { UserDataStore } from "./UserDataStore";
import { userDataStore } from "./UserDataStore";

type WithSelectors<S> = S extends {
  getState: () => infer T;
}
  ? S & {
      use: { [K in keyof T]: () => T[K] };
    }
  : never;

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

type ApplicationStore = EditorStore & UserDataStore & ErrorStore & AuthStore;

const useApplicationStoreBase = createWithEqualityFn<ApplicationStore>()(
  devtools(
    persist(
      (...all) => ({
        ...editorStore(...all),
        ...errorStore(...all),
        ...userDataStore(...all),
        ...authStore(...all),
      }),
      {
        name: "application-store", // name of the item in the storage (must be unique)
        partialize: (state: ApplicationStore) => ({
          currentIdToken: state.currentIdToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          isChatSignupComplete: state.isChatSignupComplete,
        }),
      },
    ),
    shallow,
  ),
);

// wraps the store with selectors for all state properties
const useApplicationStore = createSelectors(useApplicationStoreBase);
export default useApplicationStore;
