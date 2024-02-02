import { Badge, Button, Dropdown } from "flowbite-react";
import React, { useEffect, useState } from "react";
import { AiOutlineLoading } from "react-icons/ai";
import useApplicationStore from "../../../store/ApplicationStore";
import { UIError } from "../../../../shared/errors";
import { useForm } from "react-hook-form";
import { downloadFile } from "../../../../helpers/download-file";
import { LiaFileExportSolid } from "react-icons/lia";

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
  const { environmentVersion, architecture, addError, exportIaC } =
    useApplicationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const environmentIdField = "environmentId";
  const iacProviderField = "iacProvider";

  const defaultValues: ExportFormState = {
    environmentId: environmentVersion.id,
    iacProvider: "Pulumi",
  };

  const { setValue, register, reset, unregister, watch, handleSubmit } =
    useForm<ExportFormState>({
      defaultValues,
    });

  const watchEnvironmentId = watch(environmentIdField);
  const watchIacProvider = watch(iacProviderField);

  useEffect(() => {
    register(environmentIdField, { required: true });
    register(iacProviderField, { required: true });
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

  console.log(watchEnvironmentId);
  console.log(watchIacProvider);

  return (
    <div className="flex size-full justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div
          className={
            "mt-[10%] flex h-full flex-col gap-10 overflow-auto text-gray-700 dark:text-gray-200"
          }
        >
          <div className="mb-6 flex items-center gap-4">
            <span
              className={"size-fit rounded-full bg-primary-600 p-2 text-white "}
            >
              <LiaFileExportSolid size={32} />
            </span>
            <h2 className={"text-3xl"}>Export infrastructure as code.</h2>
          </div>
          <div className="text-md flex flex-col flex-wrap items-center gap-4 sm:flex-row">
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
              <Dropdown.Header>Choose an environment to export</Dropdown.Header>
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
          </div>
          <Button
            className="mx-auto w-full max-w-[50%]"
            size={"xl"}
            type="submit"
            color="purple"
            disabled={isSubmitting || !watchEnvironmentId || !watchIacProvider}
            isProcessing={isSubmitting}
            processingSpinner={<AiOutlineLoading className="animate-spin" />}
          >
            {isSubmitting ? "Downloading" : "Download"}
          </Button>
        </div>
      </form>
    </div>
  );
};
