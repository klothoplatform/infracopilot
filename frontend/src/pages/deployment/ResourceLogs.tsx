import { Dropdown } from "flowbite-react";
import { type FC, useState, useEffect } from "react";
import useApplicationStore from "../store/ApplicationStore";
import getResourceLogs from "../../api/GetResourceLogs";

interface ResourceLogsProps {
  logs: string[];
}

const LogViewer: FC<ResourceLogsProps> = ({ logs }) => {
  const [search, setSearch] = useState("");

  const filteredLogs = logs.filter((log) =>
    log.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search logs..."
      />
      {filteredLogs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
};

interface ResourceSelectorProps {
  resources: string[];
  selectedResource?: string;
  selectResource: (resource: string) => void;
}

export const ResourceSelector: FC<ResourceSelectorProps> = ({
  resources,
  selectedResource,
  selectResource,
}) => {
  const options = resources.map((resource) => ({
    value: resource,
    label: resource,
  }));

  const onClick = (value: string) => {
    const resource = resources.find((resource) => resource === value);
    selectResource(resource!);
  };

  console.log(options);
  return (
    <div className="mb-4 mt-8 flex flex-col gap-1">
      <Dropdown
        label={
          <div>
            <span className={"text-gray-500 dark:text-gray-300"}>stack: </span>
            {selectedResource ?? "Select a stack"}
          </div>
        }
        color={"light"}
        placement={"bottom-start"}
      >
        <Dropdown.Header>Choose a Resource</Dropdown.Header>
        {options.map((option) => (
          <Dropdown.Item
            className={"flex justify-between gap-2 disabled:opacity-50"}
            key={option.value}
            onClick={() => onClick(option.value)}
          >
            {option.label}
          </Dropdown.Item>
        ))}
      </Dropdown>
    </div>
  );
};

export const ResourceLogsPage: FC = () => {
  const [selectedResource, setSelectedResource] = useState<
    string | undefined
  >();
  const [logs, setLogs] = useState<string[]>([]);

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
        const resourceLogs = await getResourceLogs({
          idToken: currentIdToken.idToken,
          architecture: architecture!.id,
          environmentVersion: environmentVersion!.id,
          name: selectedStack!.name,
          resourceId: selectedResource,
        });
        setLogs(resourceLogs);
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
      <LogViewer logs={logs} />
    </div>
  );
};
