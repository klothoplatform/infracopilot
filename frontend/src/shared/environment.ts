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

type typedMetaEnv = {
  [key: string]: string;
} & Pick<ImportMetaEnv, "BASE_URL" | "MODE" | "DEV" | "PROD" | "SSR">;

const viteEnv: typedMetaEnv = import.meta.env as typedMetaEnv;

export const env: Environment = {
  environment: viteEnv.VITE_ENVIRONMENT || "production",
  debug: new Set(
    (viteEnv.VITE_DEBUG ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  ),
  sessionRewind: {
    enabled: viteEnv.VITE_SESSIONREWIND_ENABLED?.toLowerCase() === "true",
    apiKey: "66s8iL8YHi3iOXBqda2YSA4zLJeNyCZ8TazdUBR9",
  },
  auth0: {
    domain: viteEnv.VITE_AUTH0_DOMAIN,
    clientId: viteEnv.VITE_AUTH0_CLIENT_ID,
    callbackUrl: viteEnv.VITE_AUTH0_CALLBACK_URL,
    logoutUrl: viteEnv.VITE_AUTH0_LOGOUT_URL,
  },
  chatEnabled: viteEnv.VITE_CHAT_ENABLED?.toLowerCase() === "true",
  documentationEnabled:
    viteEnv.VITE_DOCUMENTATION_ENABLED?.toLowerCase() === "true",
  commandBarEnabled:
    viteEnv.VITE_COMMAND_BAR_ENABLED === undefined
      ? true
      : viteEnv.VITE_COMMAND_BAR_ENABLED?.toLowerCase() === "true",
  analytics: {
    writeKey: "2dypaS03m88w9VrLanctkDlxjry",
    dataplaneUrl: "https://kloashibotqvww.dataplane.rudderstack.com",
    trackErrors: viteEnv.VITE_ANALYTICS_TRACK_ERRORS?.toLowerCase() !== "false",
  },
  hiddenResources:
    viteEnv.VITE_HIDDEN_RESOURCES === undefined
      ? hiddenResources
      : viteEnv.VITE_HIDDEN_RESOURCES.split(",")
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
    dataplaneUrl: string;
    trackErrors: boolean;
    writeKey: string;
  };
  chatEnabled: boolean;
  documentationEnabled: boolean;
  environment: string;
  hiddenResources: string[];
}
