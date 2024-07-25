import { RudderAnalytics } from "@rudderstack/analytics-js";
import { env } from "./shared/environment.ts";

const analytics = new RudderAnalytics();
analytics.load(env.analytics.writeKey, env.analytics.dataplaneUrl, {
  storage: {
    encryption: {
      version: "v3",
    },
  },
});

export default analytics;
