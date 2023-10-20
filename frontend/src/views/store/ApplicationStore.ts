import type { StoreApi, UseBoundStore } from "zustand";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import type { EditorStore } from "./EditorStore";
import { editorStore } from "./EditorStore";
import type { UserStore } from "./UserStore";
import { apiStore } from "./UserStore";
import { devtools } from "zustand/middleware";

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

type ApplicationStore = EditorStore & UserStore;

const useApplicationStoreBase = createWithEqualityFn<ApplicationStore>()(
  devtools((...all) => ({
    ...editorStore(...all),
    ...apiStore(...all),
  })),
  shallow,
);

// wraps the store with selectors for all state properties
const useApplicationStore = createSelectors(useApplicationStoreBase);
export default useApplicationStore;
