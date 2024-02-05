import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../../../../components/FallbackRenderer";
import { trackError } from "../../../store/ErrorStore";
import { UIError } from "../../../../shared/errors";
import useApplicationStore from "../../../store/ApplicationStore";
import { useEffect, useState } from "react";
import { type TopologyDiff } from "../../../../shared/architecture/TopologyDiff";
import { environmentsInSync } from "../../../../api/EnvironmentsInSync";
import { diffEnvironments } from "../../../../api/DiffEnvironments";
import { type EnvironmentsInSync } from "../../../../shared/architecture/EnvironmentVersion";
import { EnvironmentDropdownSelector } from "../../../../components/environments/EnvironmentDropdownSelector";
import { FaCheckCircle } from "react-icons/fa";
import { FaCircleXmark } from "react-icons/fa6";
import { ModifiedResourceList } from "../../../../components/environments/ModifiedResourceList";
import { ModifiedEdgeList } from "../../../../components/environments/ModifiedEdgeList";
import { WorkingOverlay } from "../../../../components/WorkingOverlay";

export const EnvironmentsPane = () => {
  const {
    architecture,
    user,
    addError,
    resetUserDataState,
    currentIdToken,
    environmentVersion,
  } = useApplicationStore();

  const [sourceEnvironment, setSourceEnvironment] = useState<string>(
    architecture.defaultEnvironment,
  );
  const [targetEnvironmentId, setTargetEnvironmentId] = useState<string>(
    architecture.defaultEnvironment !== environmentVersion.id
      ? environmentVersion.id
      : architecture.environments.find((a) => !a.default)?.id ?? "",
  );
  const [diff, setDiff] = useState<TopologyDiff | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inSync, setInSync] = useState<EnvironmentsInSync | undefined>(
    undefined,
  );

  useEffect(() => {
    (async () => {
      if (!isLoading && architecture) {
        try {
          const diff = await diffEnvironments({
            architectureId: architecture.id,
            targetEnvironmentId: targetEnvironmentId,
            idToken: currentIdToken.idToken,
          });
          setDiff(diff);
          const inSync = await environmentsInSync({
            architectureId: architecture.id,
            targetEnvironmentId: targetEnvironmentId,
            idToken: currentIdToken.idToken,
          });
          setInSync(inSync);
        } catch (error: any) {
          console.error(error);
          const message = "Failed to get environment info!";
          trackError(
            new UIError({
              errorId: "EnvironmentsPane:diffEnvironments",
              message,
              cause: error,
            }),
          );
        } finally {
          setIsLoading(false);
        }
      }
    })();
  }, [
    architecture,
    targetEnvironmentId,
    sourceEnvironment,
    environmentVersion,
  ]);

  console.log(diff);
  return (
    <div className="flex w-full flex-col  items-center  justify-center  dark:bg-gray-900">
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
        <div className="justify-left items-left flex w-full p-2">
          <div className="items-left col-2 flex flex-col gap-4">
            <div className="dark:text-white">
              <h2>Comparing Changes</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose two environments to see what's changed or ready to be
                promoted
              </p>
            </div>
            <div className="flex items-center gap-4">
              <EnvironmentDropdownSelector
                sourceEnvironment={sourceEnvironment}
                targetEnvironmentId={targetEnvironmentId}
                setSourceEnvironment={setSourceEnvironment}
                setTargetEnvironmentId={setTargetEnvironmentId}
              />

              {!inSync ? null : inSync?.inSync ? (
                <>
                  <span className="me-2 text-green-600 dark:text-green-400">
                    In sync
                  </span>
                  <FaCheckCircle className="text-green-600 dark:text-green-400" />
                </>
              ) : (
                <>
                  <span className="me-2 text-red-600 dark:text-red-400">
                    Out of sync
                  </span>
                  <FaCircleXmark className="text-red-600 dark:text-red-400" />
                </>
              )}
            </div>
          </div>
        </div>
        <div className="position-fixed end-0 start-0 mb-2 max-h-full min-h-0 w-full overflow-y-auto overflow-x-hidden pb-2">
          <div className="d-flex flex-column vh-100 w-full">
            <div className="bg-dark grow-1 w-full gap-2 overflow-auto rounded p-4 dark:text-white">
              <h2 className="text-x mb-4 font-normal">Modified Resources</h2>
              <ModifiedResourceList
                resources={diff?.resources}
                sourceEnvironment={sourceEnvironment}
                targetEnvironmentId={targetEnvironmentId}
              />
            </div>
          </div>
          <div className="d-flex flex-column vh-100">
            <div className="bg-dark grow-1 gap-2 overflow-auto rounded p-4 dark:text-white">
              <h2 className="text-x my-4 font-normal">Modified Edges</h2>
              <ModifiedEdgeList
                edges={diff?.edges}
                sourceEnvironment={sourceEnvironment}
                targetEnvironmentId={targetEnvironmentId}
              />
            </div>
          </div>
        </div>
        {isLoading && (
          <WorkingOverlay show={isLoading} message={"Getting Differences"} />
        )}
      </ErrorBoundary>
    </div>
  );
};

// return (
//   <div className="flex w-full flex-col  items-center  justify-center  dark:bg-gray-900">
//     <ErrorBoundary
//       fallbackRender={FallbackRenderer}
//       onError={(error, info) => {
//         trackError(
//           new UIError({
//             message: "uncaught error in EnvironmentsPane",
//             errorId: "EnvironmentsPane:ErrorBoundary",
//             cause: error,
//             data: {
//               info,
//             },
//           }),
//         );
//       }}
//       onReset={() => resetUserDataState()}
//     >
//       <div className="justify-left items-left flex p-2">
//         <div className="items-left flex gap-4">
//           <h2>Comparing Changes</h2>
//           <EnvironmentDropdownSelector
//             sourceEnvironment={sourceEnvironment}
//             targetEnvironmentId={targetEnvironmentId}
//             setSourceEnvironment={setSourceEnvironment}
//             setTargetEnvironmentId={setTargetEnvironmentId}
//           />
//           {!inSync ? null : inSync?.inSync ? (
//             <div className="flex items-center gap-4">
//               <span className="me-2 text-green-600 dark:text-green-400">
//                 In sync
//               </span>
//               <FaCheckCircle className="text-green-600 dark:text-green-400" />
//             </div>
//           ) : (
//             <div className="flex items-center gap-4">
//               <span className="me-2 text-red-600 dark:text-red-400">
//                 Out of sync
//               </span>
//               <FaCircleXmark className="text-red-600 dark:text-red-400" />
//             </div>
//           )}
//         </div>
//       </div>
//       <div className="position-fixed end-0 start-0 mb-2 max-h-full min-h-0 w-full overflow-y-auto overflow-x-hidden pb-2">
//         <div className="d-flex flex-column vh-100 w-full">
//           <div className="bg-dark grow-1 w-full gap-2 overflow-auto rounded p-4 dark:text-white">
//             <h2 className="text-x mb-4 font-normal">Modified Resources</h2>
//             <ModifiedResourceList
//               resources={diff?.resources}
//               sourceEnvironment={sourceEnvironment}
//               targetEnvironmentId={targetEnvironmentId}
//             />
//           </div>
//         </div>
//         <div className="d-flex flex-column vh-100">
//           <div className="bg-dark grow-1 gap-2 overflow-auto rounded p-4 dark:text-white">
//             <h2 className="text-x my-4 font-normal">Modified Edges</h2>
//             <ModifiedEdgeList
//               edges={diff?.edges}
//               sourceEnvironment={sourceEnvironment}
//               targetEnvironmentId={targetEnvironmentId}
//             />
//           </div>
//         </div>
//       </div>
//       {isLoading && (
//         <WorkingOverlay show={isLoading} message={"Getting Differences"} />
//       )}
//     </ErrorBoundary>
//   </div>
// );

// return (
//   <div className="flex w-full flex-col dark:bg-gray-900">
//     <ErrorBoundary
//       fallbackRender={FallbackRenderer}
//       onError={(error, info) => {
//         trackError(
//           new UIError({
//             message: "uncaught error in EnvironmentsPane",
//             errorId: "EnvironmentsPane:ErrorBoundary",
//             cause: error,
//             data: {
//               info,
//             },
//           }),
//         );
//       }}
//       onReset={() => resetUserDataState()}
//     >
//       <div className="justify-left items-left flex p-2">
//         <div className="grow-1 gap-2 overflow-auto rounded p-4 dark:text-white">
//           <h2 className="dark:">Comparing Changes</h2>
//           <EnvironmentDropdownSelector
//             sourceEnvironment={sourceEnvironment}
//             targetEnvironmentId={targetEnvironmentId}
//             setSourceEnvironment={setSourceEnvironment}
//             setTargetEnvironmentId={setTargetEnvironmentId}
//           />
//           {!inSync ? null : inSync?.inSync ? (
//             <div className="flex items-center gap-4">
//               <span className="me-2 text-green-600 dark:text-green-400">
//                 In sync
//               </span>
//               <FaCheckCircle className="text-green-600 dark:text-green-400" />
//             </div>
//           ) : (
//             <div className="flex items-center gap-4">
//               <span className="me-2 text-red-600 dark:text-red-400">
//                 Out of sync
//               </span>
//               <FaCircleXmark className="text-red-600 dark:text-red-400" />
//             </div>
//           )}
//         </div>
//       </div>
//       <div className="flex w-full overflow-y-auto overflow-x-hidden pb-2 dark:text-white">
//       <h2 className="text-x mb-4 font-normal">Modified Resources</h2>
//         <div className="flex w-full flex-col items-center justify-center">
//           <ModifiedResourceList
//             resources={diff?.resources}
//             sourceEnvironment={sourceEnvironment}
//             targetEnvironmentId={targetEnvironmentId}
//           />
//         </div>
//           <h2 className="text-x my-4 font-normal">Modified Edges</h2>
//           <div className="flex w-full flex-col items-center justify-center">

//           <ModifiedEdgeList
//             edges={diff?.edges}
//             sourceEnvironment={sourceEnvironment}
//             targetEnvironmentId={targetEnvironmentId}
//           />
//         </div>
//       </div>
//       {isLoading && (
//         <WorkingOverlay show={isLoading} message={"Getting Differences"} />
//       )}
//     </ErrorBoundary>
//   </div>
// );
