import { Button, Dropdown, Label, Modal } from "flowbite-react";
import { useForm } from "react-hook-form";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineLoading } from "react-icons/ai";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { UIError } from "../../shared/errors";
import { FaArrowRight } from "react-icons/fa6";
import { FormFooter } from "../FormFooter";

interface PromoteEnvironmentModalProps {
  onClose: () => void;
  setIsLoadingArchitecture?: (isLoading: boolean) => void;
  show: boolean;
}

interface PromoteEnvironmentFormState {
  targetEnvironmentId: string;
}

export default function PromoteEnvironmentModal({
  onClose,
  show,
}: PromoteEnvironmentModalProps) {
  const {
    resetEditorState,
    addError,
    architecture,
    promoteToEnvironment,
    environmentVersion,
  } = useApplicationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceEnvironment = architecture.defaultEnvironment;
  const defaultTargetEnvironment =
    architecture.defaultEnvironment !== environmentVersion.id
      ? architecture.defaultEnvironment
      : architecture.environments.find((a) => !a.default)?.id ?? "";

  const targetFieldId = "targetEnvironmentId";

  const {
    setValue,
    register,
    unregister,
    reset,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<PromoteEnvironmentFormState>({
    defaultValues: {
      targetEnvironmentId: defaultTargetEnvironment,
    },
  });

  useEffect(() => {
    if (show) {
      reset();
    }
  }, [reset, show]);

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

  let onSubmit = async (state: PromoteEnvironmentFormState) => {
    let id;
    let success = false;
    setIsSubmitting(true);
    try {
      await promoteToEnvironment(state.targetEnvironmentId);
      success = true;
    } catch (e: any) {
      addError(
        new UIError({
          errorId: "PromoteEnvironmentModal:Submit",
          message: `Promotion from ${sourceEnvironment} to ${watchTargetEnvironmentId} failed.`,
          messageComponent: (
            <span>
              Promotion from <i>{sourceEnvironment}</i> environment to{" "}
              <i>{watchTargetEnvironmentId}</i> failed.
            </span>
          ),
          cause: e as Error,
        }),
      );
    }
    setIsSubmitting(false);
    if (success) {
      onClose();
      if (id) {
        try {
          resetEditorState();
        } catch (e: any) {
          addError(
            new UIError({
              errorId: "PromoteEnvironmentModal:Submit",
              message: `Promotion from ${sourceEnvironment} to ${watchTargetEnvironmentId} failed.`,
              messageComponent: (
                <span>
                  Promotion from <i>{sourceEnvironment}</i> to{" "}
                  <i>{watchTargetEnvironmentId}</i> failed.
                </span>
              ),
              cause: e,
            }),
          );
        }
      }
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose, reset]);

  const watchTargetEnvironmentId = watch(targetFieldId);

  return (
    <Modal
      show={show}
      onClose={() => {
        onClose?.();
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header>Promote environment</Modal.Header>
        <Modal.Body
          className={"flex flex-col gap-4 text-gray-700 dark:text-gray-200"}
        >
          <p>
            Promote the selected source environment to the target environment.
          </p>
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
          </div>
        </Modal.Body>
        <Modal.Footer>
          <FormFooter>
            <Button
              type="submit"
              color="purple"
              disabled={isSubmitting}
              isProcessing={isSubmitting}
              processingSpinner={<AiOutlineLoading className="animate-spin" />}
            >
              {isSubmitting ? "Promoting" : "Promote"}
            </Button>
          </FormFooter>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
