import type { FC } from "react";
import { useState } from "react";
import { Button, Dropdown } from "flowbite-react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { WorkingOverlay } from "../WorkingOverlay";
import { UIError } from "../../shared/errors";
import { isViewMode, ViewMode } from "../../shared/ViewSettings";

interface EnvironmentSectionProps {
  small: boolean;
}

export const EnvironmentSection: FC<EnvironmentSectionProps> = ({
  small,
}: EnvironmentSectionProps) => {
  const {
    viewSettings,
    architecture: { id, environments, defaultEnvironment },
    environmentVersion: { id: currentEnvironmentId },
    refreshArchitecture,
    addError,
  } = useApplicationStore();

  const isPromotable = currentEnvironmentId === defaultEnvironment && false; // TODO: enable promote button
  const [newEnvironment, setNewEnvironment] = useState<string | null>(null);

  const changeEnvironment = (env: string) => {
    if (!env || env === currentEnvironmentId) {
      return;
    }
    setNewEnvironment(env);
    (async () => {
      try {
        await refreshArchitecture(id, env);
      } catch (e: any) {
        addError(
          new UIError({
            errorId: "EnvironmentSection:changeEnvironment",
            message: `Failed to switch environment from ${currentEnvironmentId} to ${env}`,
            messageComponent: (
              <span>
                Failed to switch environment from <i>{currentEnvironmentId}</i>{" "}
                to <i>{env}</i>
              </span>
            ),
            cause: e,
          }),
        );
      } finally {
        setNewEnvironment(null);
      }
    })();
  };

  return (
    <div className="flex w-fit items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-900">
      <span className="text-xs font-medium dark:text-white">Environment:</span>
      <EnvironmentDropdown
        environments={environments.map((env) => env.id)}
        defaultEnvironment={defaultEnvironment}
        selectedEnvironment={currentEnvironmentId}
        onChange={changeEnvironment}
      />
      {isViewMode(viewSettings, ViewMode.Edit) && (
        <PromoteEnvironmentButton small={small} disabled={!isPromotable} />
      )}
      {newEnvironment && (
        <WorkingOverlay
          message={`Switching environment to ${newEnvironment}...`}
          show={true}
        />
      )}
    </div>
  );
};

const EnvironmentDropdown: FC<{
  environments: string[];
  defaultEnvironment: string;
  selectedEnvironment: string;
  onChange?: (env: string) => void;
}> = ({ environments, defaultEnvironment, selectedEnvironment, onChange }) => {
  return (
    <Dropdown
      label={selectedEnvironment}
      color={"light"}
      arrowIcon={true}
      size={"xs"}
      theme={{
        inlineWrapper: "dark:text-white text-xs w-fit flex gap-1 items-center",
      }}
    >
      {environments.map((env) => {
        return (
          <Dropdown.Item key={env} onClick={() => onChange?.(env)}>
            {env} {env === defaultEnvironment && "(default)"}
          </Dropdown.Item>
        );
      })}
    </Dropdown>
  );
};

const PromoteEnvironmentButton: FC<{
  small?: boolean;
  disabled?: boolean;
}> = ({ small, disabled }) => {
  return (
    <Button
      disabled={disabled}
      color={"purple"}
      className="btn btn-primary"
      size={"xs"}
    >
      Promote
    </Button>
  );
};
