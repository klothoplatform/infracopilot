/*
env centralizes all environment settings for the application.

This includes environment variables, but also settings that are derived from environment variables.

Avoid using environment variables directly in the application.
Instead, use env to keep it clean.
 */

// Wave 1: Hidden Resources
const hiddenResources = [
  "aws:ec2_instance",
  "aws:sqs_queue",
  "aws:rds_proxy",
  "aws:ses_email_identity",
  "kubernetes:deployment",
];

export const env: Environment = {
  environment: process.env.REACT_APP_ENVIRONMENT ?? process.env.NODE_ENV,
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
  chatEnabled: process.env.REACT_APP_CHAT_ENABLED?.toLowerCase() === "true",
  commandBarEnabled:
    process.env.REACT_APP_COMMAND_BAR_ENABLED === undefined
      ? true
      : process.env.REACT_APP_COMMAND_BAR_ENABLED?.toLowerCase() === "true",
  analytics: {
    writeKey: "GKCsKtwCdTQO75tRzBPKAw82xVPYPqEz",
    trackErrors:
      process.env.REACT_APP_ANALYTICS_TRACK_ERRORS?.toLowerCase() !== "false",
  },
  hiddenResources:
    process.env.REACT_APP_HIDDEN_RESOURCES === undefined
      ? hiddenResources
      : process.env.REACT_APP_HIDDEN_RESOURCES.split(",")
          .map((r) => r.trim())
          .filter((r) => r.length > 0),
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
  commandBarEnabled: boolean;
  analytics: {
    writeKey: string;
    trackErrors: boolean;
  };
  chatEnabled: boolean;
  environment: string;
  hiddenResources: string[];
}
