import { type FC, useEffect } from "react";
import { Route, Routes } from "react-router";
import ArchitectureEditor from "./pages/ArchitectureEditor/ArchitectureEditor";
import ArchitectureListPage from "./pages/ArchitectureListPage";
import useApplicationStore from "./pages/store/ApplicationStore";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import { CallbackPage } from "./pages/CallbackPage";

import { AnalyticsBrowser } from "@segment/analytics-next";
import { env } from "./shared/environment";

export const analytics = AnalyticsBrowser.load({
  writeKey: env.analytics.writeKey,
});

const App: FC = function () {
  const { updateAuthentication } = useApplicationStore();
  const authContext = useAuth0();

  useEffect(() => {
    (async () => await updateAuthentication(authContext))();
  }, [authContext, updateAuthentication]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={"/architectures"} />} index />
      <Route path="/architectures" element={<ArchitectureListPage />} />
      <Route path="/editor" element={<ArchitectureEditor />} />
      <Route path="/editor/:architectureId" element={<ArchitectureEditor />} />
      <Route path="/callback" element={<CallbackPage />} />
    </Routes>
  );
};

export default App;
