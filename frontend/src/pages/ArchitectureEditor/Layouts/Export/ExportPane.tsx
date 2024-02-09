import { Badge, Button, Dropdown } from "flowbite-react";
import React, { useEffect, useState } from "react";
import { AiOutlineLoading } from "react-icons/ai";
import useApplicationStore from "../../../store/ApplicationStore";
import { UIError } from "../../../../shared/errors";
import { useForm } from "react-hook-form";
import { downloadFile } from "../../../../helpers/download-file";
import IacExplorer from "../../../../components/environments/IacExplorer";
import { trackError } from "../../../store/ErrorStore";
import { FallbackRenderer } from "../../../../components/FallbackRenderer";
import { ErrorBoundary } from "react-error-boundary";

const iacOptions = [
  {
    value: "Pulumi",
    label: (
      <>
        <span>Pulumi</span>
        <Badge color={"light"}>default</Badge>
      </>
    ),
  },
  {
    value: "Terraform",
    disabled: true,
    label: (
      <>
        <span>Terraform</span>
        <Badge color={"yellow"}>coming soon</Badge>
      </>
    ),
  },
];

interface ExportFormState {
  iacProvider: string;
  environmentId: string;
}

type FieldName = keyof ExportFormState;

export const ExportPane = () => {
  const {
    environmentVersion,
    architecture,
    addError,
    exportIaC,
    resetUserDataState,
  } = useApplicationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const environmentIdField = "environmentId";
  const iacProviderField = "iacProvider";

  const { setValue, register, reset, unregister, watch, handleSubmit } =
    useForm<ExportFormState>();

  const watchEnvironmentId = watch(environmentIdField);
  const watchIacProvider = watch(iacProviderField);

  useEffect(() => {
    register(environmentIdField, { required: true });
    register(iacProviderField, { required: true });

    const defaultValues: ExportFormState = {
      environmentId: environmentVersion.id,
      iacProvider: "Pulumi",
    };

    reset(defaultValues);
    return () => {
      unregister(environmentIdField);
      unregister(iacProviderField);
    };
  }, [register, unregister, environmentVersion.id, reset]);

  const onClick = (field: FieldName, value: string) => {
    setValue(field, value, {
      shouldTouch: true,
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  let onSubmit = async (state: ExportFormState) => {
    setIsSubmitting(true);
    try {
      const iacZip = await exportIaC(architecture.id, state.environmentId);
      const url = URL.createObjectURL(iacZip);
      downloadFile(
        `${architecture.name}_${watchEnvironmentId}.zip`
          .toLowerCase()
          .replaceAll(/\s+/g, "_"),
        url,
      );
    } catch (e: any) {
      addError(
        new UIError({
          errorId: "ExportPane:Submit",
          message: `Exporting ${state.iacProvider} from ${state.environmentId} failed.`,
          messageComponent: (
            <span>
              Exporting <i>{state.iacProvider}</i> from{" "}
              <i>{state.environmentId}</i> failed.
            </span>
          ),
          cause: e as Error,
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-col justify-center dark:bg-gray-900">
      <ErrorBoundary
        fallbackRender={FallbackRenderer}
        onError={(error, info) => {
          trackError(
            new UIError({
              message: "uncaught error in ExportPane",
              errorId: "ExportPane:ErrorBoundary",
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
          <div className="flex w-full flex-col gap-4">
            <div className="mb-2 w-full border-b border-gray-300 pb-1 dark:border-gray-700 dark:text-white">
              <h2 className="text-2xl">Export infrastructure as code</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Preview and export the infrastructure as code for your
                architecture's environments.
              </p>
            </div>
            <form
              className={
                "text-md flex w-full flex-wrap items-center gap-4 rounded-lg border border-gray-300 bg-gray-100 px-6 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:flex-row"
              }
              onSubmit={handleSubmit(onSubmit)}
            >
              export
              <Dropdown
                label={
                  <div>
                    <span className={"text-gray-500 dark:text-gray-300"}>
                      environment:{" "}
                    </span>
                    {watchEnvironmentId}
                  </div>
                }
                color={"light"}
                placement={"bottom-start"}
              >
                <Dropdown.Header>
                  Choose an environment to export
                </Dropdown.Header>
                {architecture.environments.map((env) => (
                  <Dropdown.Item
                    className={"flex justify-between gap-2"}
                    key={env.id}
                    onClick={() => onClick(environmentIdField, env.id)}
                  >
                    <span className={"mr-2"}>{env.id}</span>
                    {env.id === architecture.defaultEnvironment && (
                      <Badge color={"light"}>default</Badge>
                    )}
                  </Dropdown.Item>
                ))}
              </Dropdown>
              as
              <Dropdown
                label={
                  <div>
                    <span className={"text-gray-500 dark:text-gray-300"}>
                      iac provider:{" "}
                    </span>
                    {watchIacProvider}
                  </div>
                }
                color={"light"}
                placement={"bottom-start"}
              >
                <Dropdown.Header>Choose an IaC Provider</Dropdown.Header>
                {iacOptions.map((option) => (
                  <Dropdown.Item
                    className={"flex justify-between gap-2 disabled:opacity-50"}
                    key={option.value}
                    onClick={() => onClick(iacProviderField, option.value)}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </Dropdown.Item>
                ))}
              </Dropdown>
              <Button
                type="submit"
                color="purple"
                disabled={
                  isSubmitting || !watchEnvironmentId || !watchIacProvider
                }
                isProcessing={isSubmitting}
                processingSpinner={
                  <AiOutlineLoading className="animate-spin" />
                }
              >
                {isSubmitting ? "Downloading" : "Download"}
              </Button>
            </form>
          </div>
        </div>
        <div className="mb-12 flex size-full flex-col gap-2 px-8 py-4">
          <div className={"flex gap-2"}>
            <h3 className="text-md dark:text-white">Preview</h3>
            <Badge size={"xs"} color={"purple"}>
              <span className={"font-normal"}>environment: </span>
              {watchEnvironmentId}
            </Badge>
          </div>
          <div className="flex size-full justify-center">
            <IacExplorer
              architectureId={architecture.id}
              environmentId={watchEnvironmentId}
            />
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};
