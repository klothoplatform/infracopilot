import type { StateCreator } from "zustand/esm";
import { type Architecture } from "../../shared/architecture/Architecture";
import type { Auth0ContextInterface, User } from "@auth0/auth0-react";
import type { ErrorStore } from "./ErrorStore";
import { listArchitectures } from "../../api/ListArchitectures";
import { analytics } from "../../App";

const logoutUrl = process.env.REACT_APP_AUTH0_LOGOUT_URL;

export interface UserStoreState {
  architectures: Architecture[];
  auth0?: Auth0ContextInterface;
  currentIdToken: { idToken: string; expiresAt: number };
  isAuthenticated: boolean;
  redirectedPostLogin: boolean;
  user?: User;
}

export interface UserStoreBase extends UserStoreState {
  getArchitectures: (ignoreCache?: boolean) => Promise<Architecture[]>;
  getIdToken: () => Promise<string>;
  logout: () => void;
  loginWithRedirect: () => Promise<void>;
  updateAuthentication: (context: Auth0ContextInterface) => Promise<void>;
  resetUserState: () => void;
}

const initialState: () => UserStoreState = () => ({
  architectures: [],
  auth0: undefined,
  currentIdToken: { idToken: "", expiresAt: 0 },
  isAuthenticated: false,
  redirectedPostLogin: false,
  user: undefined,
});

export type UserStore = UserStoreBase & ErrorStore;

export const userStore: StateCreator<UserStore, [], [], UserStoreBase> = (
  set: (state: object, replace?: boolean, id?: string) => any,
  get,
) => ({
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
  getIdToken: async () => {
    let { idToken, expiresAt } = get().currentIdToken;
    const fiveMinutesInSeconds = 60 * 5;
    const fiveMinutesAgo = Date.now() / 1000 - fiveMinutesInSeconds;
    const isExpired = expiresAt - fiveMinutesAgo < fiveMinutesInSeconds;
    if (idToken && !isExpired) {
      return idToken;
    }
    const refresh = async () => {
      console.log("refreshing token");
      const auth0 = get().auth0;
      if (!auth0) {
        return { idToken: "", expiresAt: 0 };
      }
      await auth0.getAccessTokenSilently();
      const claims = await auth0.getIdTokenClaims();
      if (!claims) {
        return { idToken: "", expiresAt: 0 };
      }
      return {
        idToken: claims.__raw,
        expiresAt: claims.exp ?? 0,
      };
    };

    try {
      const { idToken, expiresAt } = await refresh();
      set({ currentIdToken: { idToken, expiresAt } }, false, "getIdToken");
    } catch (e) {
      throw new Error("User session has expired. Please log in again.");
    }
    return idToken;
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
        {
          currentIdToken: { idToken: "", expiresAt: 0 },
          user: undefined,
          isAuthenticated: false,
        },
        false,
        "updateAuthentication/unauthenticated",
      );
      return;
    }

    const oldUser = get().user;
    if (oldUser?.sub !== user?.sub) {
      if (user?.email) {
        (window as any).sessionRewind?.identifyUser({
          userId: user.email,
          userName: user.name,
        });
      }
      analytics.identify(user?.sub, {
        name: user?.name,
        email: user?.email,
      });
    }
    set(
      {
        currentIdToken: {
          idToken: claims.__raw,
          expiresAt: claims.exp ?? 0,
        },
        user,
        isAuthenticated,
        auth0: context,
      },
      false,
      "updateAuthentication/authenticated",
    );
  },
  resetUserState: () => set(initialState(), false, "resetUserState"),
});
