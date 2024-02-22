import { type FC, useEffect, useState } from "react";
import useApplicationStore from "../store/ApplicationStore";
import getResourceMetrics from "../../api/GetResourceMetrics";
import { ResourceSelector } from "./ResourceLogs";
import MetricChart from "../../components/deployment/MetricChart";

export const ResourceMetricsPage: FC = () => {
  const [selectedResource, setSelectedResource] = useState<
    string | undefined
  >();
  const [metrics, setMetrics] = useState<any[]>([]);

  const {
    resources,
    currentIdToken,
    architecture,
    environmentVersion,
    selectedStack,
    listStackResources,
  } = useApplicationStore();

  useEffect(() => {
    (async () => {
      if (selectedResource) {
        const resourceMetrics = await getResourceMetrics({
          idToken: currentIdToken.idToken,
          architecture: architecture!.id,
          environmentVersion: environmentVersion!.id,
          name: selectedStack!.name,
          resourceId: selectedResource,
        });
        setMetrics(resourceMetrics);
      }
    })();
  }, [selectedResource]);

  useEffect(() => {
    if (selectedStack) {
      listStackResources(selectedStack);
    }
  }, [selectedStack]);

  return (
    <div className="p-4">
      <h2>Resource Logs</h2>
      <ResourceSelector
        resources={resources.map((resource) => resource.id)}
        selectedResource={selectedResource}
        selectResource={setSelectedResource}
      />
      <div>
        {metrics.map((metricData) => (
          <MetricChart key={metricData.metric_name} metricData={metricData} />
        ))}
      </div>
    </div>
  );
};
