import { Button, Label, Modal, TextInput } from "flowbite-react";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { AiOutlineLoading } from "react-icons/ai";

interface DeploymentModalProps {
  onClose: () => void;
  onSubmit: (formState: any) => void;
  show: boolean;
}

export interface DeploymentFormState {
  region: string;
  access_key: string;
  secret_key: string;
  pulumi_access_token: string;
}

export default function DeploymentModal({
  onClose,
  onSubmit,
  show,
}: DeploymentModalProps) {
  const { getIdToken, user, resetEditorState, addError } =
    useApplicationStore();
  const methods = useForm<DeploymentFormState>();
  const { errors } = methods.formState;

  useEffect(() => {
    if (show) {
      methods.reset();
    }
  }, [show, methods.reset]);

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
  }, [onClose, methods.reset]);

  return (
    <Modal
      show={show}
      onClose={() => {
        onClose?.();
      }}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Modal.Header>Deploy</Modal.Header>
          <Modal.Body>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="name" value="Name" />
              </div>
              <TextInput
                data-1p-ignore
                autoComplete="off"
                id="region"
                {...methods.register("region", {
                  required: "region is required",
                  onChange: async () => {
                    await methods.trigger("region");
                  },
                })}
                defaultValue="us-east-1"
                type="text"
                color={errors.region ? "failure" : undefined}
              />

              <TextInput
                data-1p-ignore
                autoComplete="off"
                id="access_key"
                {...methods.register("access_key", {
                  required: "access_key is required",
                  onChange: async () => {
                    await methods.trigger("access_key");
                  },
                })}
                defaultValue="test access"
                type="text"
                color={errors.access_key ? "failure" : undefined}
              />

              <TextInput
                data-1p-ignore
                autoComplete="off"
                id="secret_key"
                {...methods.register("secret_key", {
                  required: "secret_key is required",
                  onChange: async () => {
                    await methods.trigger("secret_key");
                  },
                })}
                defaultValue=" test secret"
                type="text"
                color={errors.secret_key ? "failure" : undefined}
              />

              <TextInput
                data-1p-ignore
                autoComplete="off"
                id="pulumi_access_token"
                {...methods.register("pulumi_access_token", {
                  required: "pulumi_access_token is required",
                  onChange: async () => {
                    await methods.trigger("pulumi_access_token");
                  },
                })}
                defaultValue="pul-access"
                type="text"
                color={errors.pulumi_access_token ? "failure" : undefined}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="submit"
              color="purple"
              disabled={Object.entries(errors).length > 0}
              processingSpinner={<AiOutlineLoading className="animate-spin" />}
            >
              Create
            </Button>
          </Modal.Footer>
        </form>
      </FormProvider>
    </Modal>
  );
}
