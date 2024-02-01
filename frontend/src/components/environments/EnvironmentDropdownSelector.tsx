import { Button, Dropdown } from "flowbite-react";
import { FaArrowRight } from "react-icons/fa6";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { useForm } from "react-hook-form";
import { type FC, useEffect } from "react";
import { AiOutlineLoading } from "react-icons/ai";

interface EnvironmentDropdownSelectorProps {
  onSubmit: (data: EnvironmentDropdownSelectorFormState) => void;
  isSubmitting: boolean;
}

export interface EnvironmentDropdownSelectorFormState {
  sourceEnvironment: string;
  targetEnvironmentId: string;
}

export const EnvironmentDropdownSelector: FC<
  EnvironmentDropdownSelectorProps
> = ({ onSubmit, isSubmitting }) => {
  const { architecture, environmentVersion } = useApplicationStore();

  const sourceEnvironment = architecture.defaultEnvironment;
  const targetFieldId = "targetEnvironmentId";

  const defaultTargetEnvironment =
    architecture.defaultEnvironment !== environmentVersion.id
      ? architecture.defaultEnvironment
      : architecture.environments.find((a) => !a.default)?.id ?? "";

  const {
    setValue,
    register,
    unregister,
    reset,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<EnvironmentDropdownSelectorFormState>({
    defaultValues: {
      targetEnvironmentId: defaultTargetEnvironment,
      sourceEnvironment: sourceEnvironment,
    },
  });

  const watchTargetEnvironmentId = watch(targetFieldId);

  useEffect(() => {
    const targetFieldId = "targetEnvironmentId";
    register(targetFieldId, {
      required: '"To" is required.',
    });
    return () => {
      unregister(targetFieldId, { keepDefaultValue: true });
    };
  }, [register, unregister]);

  const onClick = (value: string) => {
    setValue(targetFieldId, value, {
      shouldTouch: true,
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center gap-4">
        <Dropdown
          label={
            <div>
              <span className={"text-gray-500 dark:text-gray-300"}>
                source:{" "}
              </span>
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
        <FaArrowRight />
        <Dropdown
          label={
            <div>
              <span className={"text-gray-500 dark:text-gray-300"}>
                target:{" "}
              </span>
              {watchTargetEnvironmentId}
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
              <Dropdown.Item key={env.id} onClick={() => onClick(env.id)}>
                {env.id}
              </Dropdown.Item>
            ))}
        </Dropdown>
        <Button
          type="submit"
          color="purple"
          disabled={isSubmitting}
          isProcessing={isSubmitting}
          processingSpinner={<AiOutlineLoading className="animate-spin" />}
        >
          {isSubmitting ? "Retrieving Diff" : "Get Diff"}
        </Button>
      </div>
    </form>
  );
};
