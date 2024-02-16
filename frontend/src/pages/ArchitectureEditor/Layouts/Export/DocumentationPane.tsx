import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../../../../components/FallbackRenderer";
import { trackError } from "../../../store/ErrorStore";
import { UIError } from "../../../../shared/errors";
import useApplicationStore from "../../../store/ApplicationStore";
import { useEffect, useState } from "react";
import { WorkingOverlay } from "../../../../components/WorkingOverlay";
import MDEditor from "@uiw/react-md-editor";
import { explainArchitecture } from "../../../../api/ExplainArchitecture";

export const DocumentationPane = () => {
  const {
    architecture,
    resetUserDataState,
    currentIdToken,
    environmentVersion,
  } = useApplicationStore();

  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && architecture.id && environmentVersion.id) {
      setLoading(true);
      (async () => {
        const explanation = await explainArchitecture({
          architectureId: architecture.id,
          environmentId: environmentVersion.id,
          idToken: currentIdToken.idToken,
        });
        setValue(explanation);
        setLoading(false);
      })();
    }
  }, [architecture.id, environmentVersion.id]);

  return (
    <div className="flex w-full flex-col overflow-x-auto dark:bg-gray-900">
      <ErrorBoundary
        fallbackRender={FallbackRenderer}
        onError={(error, info) => {
          trackError(
            new UIError({
              message: "uncaught error in EnvironmentsPane",
              errorId: "EnvironmentsPane:ErrorBoundary",
              cause: error,
              data: {
                info,
              },
            }),
          );
        }}
        onReset={() => resetUserDataState()}
      >
        <div className="flex w-full p-4">
          <div
            className={
              "flex size-full overflow-hidden border border-gray-300 dark:border-gray-700"
            }
          >
            <MDEditor.Markdown
              source={value}
              style={{ whiteSpace: "pre-wrap" }}
            />
          </div>
        </div>
        {loading && (
          <WorkingOverlay show={loading} message={"Getting Documentation..."} />
        )}
      </ErrorBoundary>
    </div>
  );
};
