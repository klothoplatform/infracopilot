import { type FC, useEffect } from "react";
import { Route, Routes } from "react-router";
import FlowbiteWrapper from "./components/flowbite-wrapper";
import ArchitectureEditor from "./views/ArchitectureEditor/ArchitectureEditor";
import ArchitectureListPage from "./pages/ArchitectureListPage";
import useApplicationStore from "./views/store/ApplicationStore";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import { CallbackPage } from "./pages/CallbackPage";

import { AnalyticsBrowser } from "@segment/analytics-next";

export const analytics = AnalyticsBrowser.load({
  writeKey: "GKCsKtwCdTQO75tRzBPKAw82xVPYPqEz",
});

const App: FC = function () {
  const { updateAuthentication } = useApplicationStore();
  const authContext = useAuth0();

  useEffect(() => {
    (async () => await updateAuthentication(authContext))();
  }, [authContext, updateAuthentication]);

  return (
    <Routes>
      <Route element={<FlowbiteWrapper />}>
        <Route path="/" element={<Navigate to={"/architectures"} />} index />
        <Route path="/architectures" element={<ArchitectureListPage />} />
        <Route path="/editor" element={<ArchitectureEditor />} />
        <Route
          path="/editor/:architectureId"
          element={<ArchitectureEditor />}
        />
        <Route path="/callback" element={<CallbackPage />} />
      </Route>
    </Routes>
  );
};

export default App;
