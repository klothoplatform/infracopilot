import {
  Badge,
  Button,
  Dropdown,
  Label,
  Modal,
  TextInput,
} from "flowbite-react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";
import { UIError } from "../../shared/errors";
import { AiOutlineLoading } from "react-icons/ai";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { FormFooter } from "../FormFooter";
import classNames from "classnames";

interface NewStackModalProps {
  onClose: () => void;
}

export interface NewStackFormState {
  name: string;
  provider: string;
}

type FieldName = keyof NewStackFormState;

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

export default function CreateStackModal({ onClose }: NewStackModalProps) {
  const { addError, architecture, environmentVersion, createStack } =
    useApplicationStore();

  const defaultValues: NewStackFormState = {
    name: "UntitledStack",
    provider: "Pulumi",
  };

  const methods = useForm<NewStackFormState>({
    defaultValues,
  });

  const formstate = methods.formState;
  const errors = formstate.errors;

  const [isSubmitting, setIsSubmitting] = useState(false);

  let onSubmit: SubmitHandler<any> = useCallback(
    async (state: NewStackFormState) => {
      console.log(state);
      setIsSubmitting(true);
      try {
        const stack = await createStack({
          name: state.name,
          architecture_id: architecture.id,
          environment_id: environmentVersion.id,
          provider: state.provider,
        });
      } catch (e: any) {
        console.log(e);
        addError(
          new UIError({
            errorId: "ImportResourceModal:Submit",
            message: "Failed to import resource!",
            cause: e as Error,
          }),
        );
      } finally {
        setIsSubmitting(false);
        onClose();
        methods.reset();
      }
    },
    [addError, onClose, methods],
  );

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        methods.reset();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose, methods]);

  const onClick = (field: FieldName, value: string) => {
    console.log("onClick", field, value);
    methods.setValue(field, value, {
      shouldTouch: true,
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const iacProviderField = "provider";
  const watchIacProvider = methods.watch(iacProviderField);

  return (
    <Modal
      show={true}
      onClose={() => {
        methods.reset();
        onClose?.();
      }}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Modal.Header>Create a Environment Stack</Modal.Header>
          <Modal.Body className="divide-y divide-gray-300 dark:divide-gray-600">
            <div>
              <p className="text-gray-700 dark:text-gray-200">
                Select the IaC provider you wish to use.
              </p>
              <p className="py-1 text-sm text-gray-700 dark:text-gray-200">
                IaC providers cannot be changed after the first deployment of
                the stack.
              </p>

              <div className="mb-4 mt-8 flex flex-col gap-1">
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
                      className={
                        "flex justify-between gap-2 disabled:opacity-50"
                      }
                      key={option.value}
                      onClick={() => onClick(iacProviderField, option.value)}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-2 pt-4">
              <Label
                className={classNames({
                  "text-red-600 dark:text-red-500": errors["name"],
                })}
                htmlFor="Name"
                value="Name"
              />
              <TextInput
                placeholder="Name"
                sizing="sm"
                type="text"
                color={errors["name"] ? "failure" : "gray"}
                helperText={
                  errors["name"] && (
                    <span>{errors["name"].message?.toString()}</span>
                  )
                }
                {...methods.register("name", {
                  required: "Name is required",
                  pattern: {
                    value: /^[a-zA-Z0-9_./\-:\[\]]*$/,
                    message:
                      "Name must only contain alphanumeric characters, dashes, underscores, dots, and slashes",
                  },
                  minLength: {
                    value: 1,
                    message: "Name must be at least 1 character long",
                  },
                  onChange: async () => {
                    await methods.trigger("name");
                  },
                })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <FormFooter>
              <Button
                type="submit"
                color="purple"
                disabled={Object.entries(errors).length > 0}
                isProcessing={isSubmitting}
                processingSpinner={
                  <AiOutlineLoading className="animate-spin" />
                }
              >
                Create
              </Button>
            </FormFooter>
          </Modal.Footer>
        </form>
      </FormProvider>
    </Modal>
  );
}
