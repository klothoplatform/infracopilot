import { type AppState, Auth0Provider } from "@auth0/auth0-react";
import React, { type PropsWithChildren, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { env } from "../shared/environment";
import useApplicationStore from "../pages/store/ApplicationStore";
import { WorkingOverlay } from "../components/WorkingOverlay";

interface Auth0ProviderWithNavigateProps {
  children: React.ReactNode;
}

export const Auth0ProviderWithNavigate = ({
  children,
}: PropsWithChildren<Auth0ProviderWithNavigateProps>): React.JSX.Element | null => {
  const navigate = useNavigate();

  const { handleAuthCallback } = useApplicationStore();

  const domain = env.auth0.domain;
  const clientId = env.auth0.clientId;
  const redirectUri = env.auth0.callbackUrl;

  const { isLoggingIn, isAuthenticated } = useApplicationStore();
  const [appState, setAppState] = useState<AppState | undefined>(undefined);
  const [workingMessage, setWorkingMessage] = useState<string>("");
  const onRedirectCallback = (appState?: AppState) => {
    setAppState(appState);
    console.log("onRedirectCallback", appState);
    if (appState?.returnTo) {
      navigate(appState.returnTo);
    }
  };

  useEffect(() => {
    if (!isLoggingIn && isAuthenticated && appState) {
      setAppState(undefined);
      switch (appState?.action) {
        case "clone":
          if (appState?.architecture?.name) {
            setWorkingMessage(`Cloning ${appState.architecture.name}...`);
          } else {
            setWorkingMessage(`Cloning architecture...`);
          }
          break;
      }
      (async function doHandleAuthCallback() {
        const handler = handleAuthCallback(appState);
        if (handler.workingMessage) {
          setWorkingMessage(handler.workingMessage);
        }
        try {
          const result = await handler.invocation;
          if (result?.navigateTo) {
            console.log("navigating to", result.navigateTo);
            navigate(result.navigateTo);
          }
        } finally {
          setWorkingMessage("");
        }
      })();
    }
  }, [isLoggingIn, isAuthenticated, appState, handleAuthCallback, navigate]);

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
      {!workingMessage && children}
      {workingMessage && <WorkingPage message={workingMessage} />}
    </Auth0Provider>
  );
};

const WorkingPage = ({ message }: { message: string }) => {
  return (
    <div className="h-screen w-screen dark:bg-gray-900">
      <WorkingOverlay message={message} show />
    </div>
  );
};
