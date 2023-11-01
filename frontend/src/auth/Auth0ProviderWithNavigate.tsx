import { type AppState, Auth0Provider } from "@auth0/auth0-react";
import React, { type PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { env } from "../shared/environment";

interface Auth0ProviderWithNavigateProps {
  children: React.ReactNode;
}

export const Auth0ProviderWithNavigate = ({
  children,
}: PropsWithChildren<Auth0ProviderWithNavigateProps>): React.JSX.Element | null => {
  const navigate = useNavigate();

  const domain = env.auth0.domain;
  const clientId = env.auth0.clientId;
  const redirectUri = env.auth0.callbackUrl;

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  if (!(domain && clientId && redirectUri)) {
    return null;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
};
