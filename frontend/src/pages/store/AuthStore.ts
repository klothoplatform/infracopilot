import type { StateCreator } from "zustand/esm";
import type { Auth0ContextInterface, User } from "@auth0/auth0-react";
import type { ErrorStore } from "./ErrorStore";
import { analytics } from "../../App";
import { env } from "../../shared/environment";

const logoutUrl = env.auth0.logoutUrl;

export interface AuthStoreState {
  auth0?: Auth0ContextInterface;
  currentIdToken: { idToken: string; expiresAt: number };
  isAuthenticated: boolean;
  redirectedPostLogin: boolean;
  user?: User;
  isLoggingIn: boolean;
}

export interface AuthStoreBase extends AuthStoreState {
  getIdToken: () => Promise<string>;
  logout: () => void;
  loginWithRedirect: (appState: { [key: string]: any }) => Promise<void>;
  updateAuthentication: (context: Auth0ContextInterface) => Promise<void>;
  resetAuthState: () => void;
}

const initialState: () => AuthStoreState = () => ({
  auth0: undefined,
  currentIdToken: { idToken: "", expiresAt: 0 },
  isAuthenticated: false,
  redirectedPostLogin: false,
  user: undefined,
  isLoggingIn: false,
});

export type AuthStore = AuthStoreBase & ErrorStore;

export const authStore: StateCreator<AuthStore, [], [], AuthStoreBase> = (
  set: (state: object, replace?: boolean, id?: string) => any,
  get,
) => ({
  ...initialState(),
  getIdToken: async () => {
    let { idToken, expiresAt } = get().currentIdToken;
    const fiveMinutesInSeconds = 60 * 5;
    const fiveMinutesAgo = Date.now() / 1000 - fiveMinutesInSeconds;
    const isExpired = expiresAt - fiveMinutesAgo < fiveMinutesInSeconds;
    if (idToken && !isExpired) {
      return idToken;
    }
    const auth0 = get().auth0;
    if (!auth0 || (!auth0.isAuthenticated && !auth0.isLoading)) {
      return "";
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
  loginWithRedirect: async (appState: { [key: string]: any }) => {
    const auth0 = get().auth0;
    if (!auth0) {
      return;
    }

    if (!get().isAuthenticated && !auth0.isLoading) {
      set({ isLoggingIn: true }, false, "loginWithRedirect/isLoggingIn");
      await auth0.loginWithRedirect({
        appState: {
          ...appState,
        },
      });
    }
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
          auth0: context,
          isLoggingIn: context.isLoading,
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
      (async () => {
        if (env.commandBarEnabled && user?.sub) {
          (window as any).CommandBar?.boot(user.sub);
        }

        analytics.identify(user?.sub, {
          label: user?.name,
          email: user?.email,
        });
      })();
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
        isLoggingIn: !isAuthenticated,
      },
      false,
      "updateAuthentication/authenticated",
    );
  },
  resetAuthState: () => set(initialState(), false, "resetAuthState"),
});
