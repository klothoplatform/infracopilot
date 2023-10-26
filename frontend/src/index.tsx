import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import reportWebVitals from "./reportWebVitals";
import App from "./App";
import { Auth0ProviderWithNavigate } from "./auth/Auth0ProviderWithNavigate";
import { BrowserRouter } from "react-router-dom";

const container = document.getElementById("root");

if (!container) {
  throw new Error("React root element doesn't exist!");
}

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

if (process.env.REACT_APP_SESSIONREWIND_ENABLED === "true") {
  enableSessionRewind({
    apiKey: "66s8iL8YHi3iOXBqda2YSA4zLJeNyCZ8TazdUBR9",
    startRecording: true,
  });
}

const root = createRoot(container);
root.render(
  <BrowserRouter>
    <Auth0ProviderWithNavigate>
      <StrictMode>
        <App />
      </StrictMode>
    </Auth0ProviderWithNavigate>
  </BrowserRouter>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
