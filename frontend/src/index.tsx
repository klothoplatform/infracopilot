import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import reportWebVitals from "./reportWebVitals";
import App from "./App";
import { Auth0ProviderWithNavigate } from "./auth/Auth0ProviderWithNavigate";
import { BrowserRouter } from "react-router-dom";
import { env } from "./shared/environment";
import FlowbiteWrapper from "./components/flowbite-wrapper";
import { setChonkyDefaults } from "chonky";
import { ChonkyIconFA } from "chonky-icon-fontawesome";
import { initializeIcons, registerIcons } from "@fluentui/react";
import { DEFAULT_COMPONENT_ICONS } from "@azure/communication-react";

const container = document.getElementById("root");

if (!container) {
  throw new Error("React root element doesn't exist!");
}

setChonkyDefaults({ iconComponent: ChonkyIconFA, disableDragAndDrop: true });

// TODO: consider building our own Fluent UI icon set with just the MS chat icons we need.
//       see: https://github.com/microsoft/fluentui/wiki/Using-icons
initializeIcons();
registerIcons({ icons: { ...DEFAULT_COMPONENT_ICONS } });

function enableSessionRewind(args: {
  apiKey: string;
  startRecording: boolean;
}) {
  (window as any).SessionRewindConfig = args;
  const f = document.createElement("script") as any;
  f.async = 1;
  f.crossOrigin = "anonymous";
  f.src = "https://rec.sessionrewind.com/srloader.js";
  const g = document.getElementsByTagName("head")[0];
  g.insertBefore(f, g.firstChild);
}

if (env.sessionRewind.enabled) {
  enableSessionRewind({
    apiKey: env.sessionRewind.apiKey,
    startRecording: true,
  });
}

const root = createRoot(container);
root.render(
  <BrowserRouter>
    <StrictMode>
      <FlowbiteWrapper>
        <Auth0ProviderWithNavigate>
          <App />
        </Auth0ProviderWithNavigate>
      </FlowbiteWrapper>
    </StrictMode>
  </BrowserRouter>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
