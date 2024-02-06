import { Button, Dropdown } from "flowbite-react";
import { FaArrowLeft } from "react-icons/fa6";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { type FC } from "react";
import { AiOutlineLoading } from "react-icons/ai";

interface EnvironmentDropdownSelectorProps {
  setSourceEnvironment: (sourceEnvironment: string) => void;
  setTargetEnvironmentId: (targetEnvironmentId: string) => void;
  sourceEnvironment: string;
  targetEnvironmentId: string;
  onRefresh?: () => void;
  isSubmitting?: boolean;
}

export const EnvironmentDropdownSelector: FC<
  EnvironmentDropdownSelectorProps
> = ({
  setSourceEnvironment,
  setTargetEnvironmentId,
  sourceEnvironment,
  targetEnvironmentId,
  onRefresh,
  isSubmitting,
}) => {
  const { architecture } = useApplicationStore();

  return (
    <div className="flex items-center gap-4">
      <Dropdown
        label={
          <div>
            <span className={"text-gray-500 dark:text-gray-300"}>base: </span>
            {sourceEnvironment}
          </div>
        }
        color={"light"}
        placement={"bottom-start"}
        size={"sm"}
      >
        <Dropdown.Header>Choose a source environment</Dropdown.Header>
        <Dropdown.Item>{sourceEnvironment} (default)</Dropdown.Item>
      </Dropdown>
      <FaArrowLeft className={"text-gray-500 dark:text-gray-300"} />
      <Dropdown
        label={
          <div>
            <span className={"text-gray-500 dark:text-gray-300"}>
              compare:{" "}
            </span>
            {targetEnvironmentId}
          </div>
        }
        color={"light"}
        placement={"bottom-start"}
        size={"sm"}
      >
        <Dropdown.Header>Choose a target environment</Dropdown.Header>
        {architecture.environments
          .filter((env) => env.id !== sourceEnvironment && env)
          .map((env) => (
            <Dropdown.Item
              key={env.id}
              onClick={() => setTargetEnvironmentId(env.id)}
            >
              {env.id}
            </Dropdown.Item>
          ))}
      </Dropdown>
      <Button
        type="submit"
        color="purple"
        isProcessing={isSubmitting}
        onClick={onRefresh}
        processingSpinner={<AiOutlineLoading className="animate-spin" />}
      >
        {isSubmitting ? "Refreshing" : "Refresh"}
      </Button>
    </div>
  );
};
