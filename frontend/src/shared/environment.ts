/*
env centralizes all environment settings for the application.

This includes environment variables, but also settings that are derived from environment variables.

Avoid using environment variables directly in the application.
Instead, use env to keep it clean.
 */
export const env: Environment = {
  debug: new Set(
    (process.env.REACT_APP_DEBUG ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  ),
  sessionRewind: {
    enabled:
      process.env.REACT_APP_SESSIONREWIND_ENABLED?.toLowerCase() === "true",
    apiKey: "66s8iL8YHi3iOXBqda2YSA4zLJeNyCZ8TazdUBR9",
  },
  auth0: {
    domain: process.env.REACT_APP_AUTH0_DOMAIN,
    clientId: process.env.REACT_APP_AUTH0_CLIENT_ID,
    callbackUrl: process.env.REACT_APP_AUTH0_CALLBACK_URL,
    logoutUrl: process.env.REACT_APP_AUTH0_LOGOUT_URL,
  },
  analytics: {
    writeKey: "GKCsKtwCdTQO75tRzBPKAw82xVPYPqEz",
  },
};

export interface Environment {
  debug: Set<string>;
  sessionRewind: {
    enabled: boolean;
    apiKey: string;
  };
  auth0: {
    domain?: string;
    clientId?: string;
    callbackUrl?: string;
    logoutUrl?: string;
  };
  analytics: {
    writeKey: string;
  };
}
