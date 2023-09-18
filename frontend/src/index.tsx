import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import reportWebVitals from "./reportWebVitals";
import App from "./App";
import { Auth0Provider } from "@auth0/auth0-react";
import { Auth0ProviderWithNavigate } from "./auth/Auth0ProviderWithNavigate";
import { BrowserRouter, Navigate } from "react-router-dom";

const container = document.getElementById("root");

if (!container) {
  throw new Error("React root element doesn't exist!");
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
