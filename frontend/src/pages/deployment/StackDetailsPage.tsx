import { useRef, type FC, useEffect } from "react";
import { StackSelector } from "../../components/deployment/StackSelector";
import useApplicationStore from "../store/ApplicationStore";
import { Tabs, type TabsRef } from "flowbite-react";
import { ResourceList } from "../../components/deployment/StackResourceList";
import DeploymentsTable from "../../components/deployment/DeploymentsTable";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackRenderer } from "../../components/FallbackRenderer";
import { trackError } from "../store/ErrorStore";
import { UIError } from "../../shared/errors";
import { ResourceLogsPage } from "./ResourceLogs";
import { ResourceMetricsPage } from "./ResourceMetrics";

export const StackDetailsPage: FC = () => {
  const tabsRef = useRef<TabsRef>(null);

  const {
    selectedStack,
    deployments,
    listDeployments,
    resetUserDataState,
    listStackResources,
    resources,
  } = useApplicationStore();

  useEffect(() => {
    if (selectedStack) {
      listDeployments(selectedStack);
      listStackResources(selectedStack);
    }
  }, [selectedStack]);

  return (
    <div className="w-full dark:text-white">
      <ErrorBoundary
        fallbackRender={FallbackRenderer}
        onError={(error, info) => {
          trackError(
            new UIError({
              message: "uncaught error in ArchitectureListPage",
              errorId: "ArchitectureListPage:ErrorBoundary",
              cause: error,
              data: {
                info,
              },
            }),
          );
        }}
        onReset={() => resetUserDataState()}
      >
        <h2>Stack Details</h2>
        <StackSelector />

        <Tabs ref={tabsRef}>
          <Tabs.Item title="Overview">
            <div className="p-4">
              <h3>Overview</h3>
              <p>Stack Name: {selectedStack?.name}</p>
              <p>Stack ID: {selectedStack?.name}</p>
              <p>Stack Status: {selectedStack?.status}</p>
            </div>
          </Tabs.Item>
          <Tabs.Item title="Resources">
            <div className="p-4">
              <h3>Resources</h3>
              <ResourceList resources={resources} />
            </div>
          </Tabs.Item>
          <Tabs.Item title="Events">
            <div className="p-4">
              <h3>Events</h3>
              <DeploymentsTable deployments={deployments} />
            </div>
          </Tabs.Item>
          <Tabs.Item title="Logs">
            <div className="p-4">
              <h3>Logs</h3>
            </div>
            <ResourceLogsPage />
          </Tabs.Item>
          <Tabs.Item title="Metrics">
            <div className="p-4">
              <h3>Metrics</h3>
            </div>
            <ResourceMetricsPage />
          </Tabs.Item>
        </Tabs>
      </ErrorBoundary>
    </div>
  );
};
