import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import React, { type PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";

interface Auth0ProviderWithNavigateProps {
  children: React.ReactNode;
}

export const Auth0ProviderWithNavigate = ({
  children,
}: PropsWithChildren<Auth0ProviderWithNavigateProps>): JSX.Element | null => {
  const navigate = useNavigate();

  const domain =
    process.env.REACT_APP_AUTH0_DOMAIN || "klotho-dev.us.auth0.com";
  const clientId =
    process.env.REACT_APP_AUTH0_CLIENT_ID || "A0sIE3wvh8LpG8mtJEjWPnBqZgBs5cNM";
  const redirectUri =
    process.env.REACT_APP_AUTH0_CALLBACK_URL || window.location.origin;

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  if (!(domain && clientId && redirectUri)) {
    return null;
  }
  console.log(window.location.origin);

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
};
