import { useEffect, type FC, useState } from "react";
import { Route, Routes } from "react-router";
import FlowbiteWrapper from "./components/flowbite-wrapper";
import ArchitectureEditor from "./views/ArchitectureEditor/ArchitectureEditor";
import ArchitectureListPage from "./pages/ArchitectureListPage";
import useApplicationStore from "./views/store/ApplicationStore";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import { CallbackPage } from "./pages/CallbackPage";

const App: FC = function () {
  const { idToken, setIdToken } = useApplicationStore();
  const { user, error, isAuthenticated, getIdTokenClaims } = useAuth0();

  useEffect(() => {
    (async () => {
      console.log(idToken, isAuthenticated, user, error);
      const claims = await getIdTokenClaims();
      if (!claims) {
        setIdToken("default");
        return;
      }
      setIdToken(claims.__raw);
    })();
  }, [idToken, isAuthenticated, user, error]);
  console.log(idToken, isAuthenticated, user, error);

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
