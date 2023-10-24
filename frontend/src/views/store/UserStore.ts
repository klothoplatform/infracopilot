import type { StateCreator } from "zustand/esm";
import { type Architecture } from "../../shared/architecture/Architecture";
import type { Auth0ContextInterface } from "@auth0/auth0-react";
import type { ErrorStore } from "./ErrorStore";
import { listArchitectures } from "../../api/ListArchitectures";

const logoutUrl = process.env.REACT_APP_AUTH0_LOGOUT_URL;

export interface UserStoreState {
  idToken: string;
  user: any;
  isAuthenticated: boolean;
  auth0: Auth0ContextInterface | null;
  architectures: Architecture[];
  redirectedPostLogin: boolean;
}

export interface UserStoreBase extends UserStoreState {
  loadArchitectures: () => Promise<void>;
  logout: () => void;
  loginWithRedirect: () => Promise<void>;
  updateAuthentication: (context: Auth0ContextInterface) => Promise<void>;
  resetUserState: () => void;
}

const initialState: () => UserStoreState = () => ({
  idToken: "",
  user: null,
  isAuthenticated: false,
  architectures: [],
  auth0: null,
  redirectedPostLogin: false,
});

export type UserStore = UserStoreBase & ErrorStore;

export const userStore: StateCreator<UserStore, [], [], UserStoreBase> = (
  set: (state: object, replace?: boolean, id?: string) => any,
  get,
) => ({
  ...initialState(),
  loadArchitectures: async () => {
    const usersArchitectures = await listArchitectures(get().idToken);
    set({ architectures: usersArchitectures }, false, "loadArchitectures");
  },
  logout: () => {
    console.log(logoutUrl, "logouturl");
    get().auth0?.logout({
      logoutParams: { returnTo: logoutUrl },
    });
  },
  loginWithRedirect: async () => {
    const auth0 = get().auth0;
    if (!auth0) {
      return;
    }

    if (!get().isAuthenticated && !auth0.isLoading) {
      await auth0.loginWithRedirect({
        appState: { returnTo: window.location.pathname },
      });
    }
    set(
      {
        loggedIn: true,
      },
      false,
      "loginWithRedirect",
    );
  },

  updateAuthentication: async (context: Auth0ContextInterface) => {
    const { getIdTokenClaims, isAuthenticated, user } = context;
    const claims = await getIdTokenClaims();
    if (!claims) {
      set(
        { idToken: "", user: null, isAuthenticated: false },
        false,
        "updateAuthentication/unauthenticated",
      );
      return;
    }
    set(
      { idToken: claims.__raw, user, isAuthenticated, auth0: context },
      false,
      "updateAuthentication/authenticated",
    );
  },
  resetUserState: () => set(initialState(), false, "resetUserState"),
});
