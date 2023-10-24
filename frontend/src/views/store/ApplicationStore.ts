import type { StoreApi, UseBoundStore } from "zustand";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import type { EditorStore } from "./EditorStore";
import { editorStore } from "./EditorStore";
import type { UserStoreBase } from "./UserStore";
import { userStore } from "./UserStore";
import { devtools, persist } from "zustand/middleware";
import { errorStore } from "./ErrorStore";

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

type ApplicationStore = EditorStore & UserStoreBase;

const useApplicationStoreBase = createWithEqualityFn<ApplicationStore>()(
  devtools(
    persist(
      (...all) => ({
        ...editorStore(...all),
        ...errorStore(...all),
        ...userStore(...all),
      }),
      {
        name: "user-storage", // name of the item in the storage (must be unique)
        partialize: (state: ApplicationStore) => ({
          idToken: state.idToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          architectures: state.architectures,
        }),
      },
    ),
    shallow,
  ),
);

// wraps the store with selectors for all state properties
const useApplicationStore = createSelectors(useApplicationStoreBase);
export default useApplicationStore;
