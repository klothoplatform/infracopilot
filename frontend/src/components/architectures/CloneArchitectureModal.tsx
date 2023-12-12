import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import cloneArchitecture from "../../api/CloneArchitecture";
import { UIError } from "../../shared/errors";
import { AiOutlineLoading } from "react-icons/ai";

interface CloneArchitectureModalProps {
  onClose: () => void;
  show: boolean;
  id: string;
  name?: string;
}

export interface CloneArchitectureFormState {
  name: string;
}

export default function CloneArchitectureModal({
  onClose,
  show,
  id,
  name,
}: CloneArchitectureModalProps) {
  const {
    reset,
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<CloneArchitectureFormState>({
    defaultValues: { name: `${name}-Copy` },
  });

  const { getIdToken, getArchitectures, addError } = useApplicationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (state: CloneArchitectureFormState) => {
    let success = false;
    setIsSubmitting(true);
    try {
      await cloneArchitecture({
        id: id,
        name: state.name,
        idToken: await getIdToken(),
      });
      success = true;
    } catch (e: any) {
      addError(
        new UIError({
          errorId: "CloneArchitectureModal:Submit",
          message: `Failed to clone architecture: ${name}`,
          messageComponent: (
            <span>
              Failed to clone architecture: <strong>{name}</strong>
            </span>
          ),
          cause: e,
          data: {
            id,
            name,
            newName: state.name,
          },
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
    if (success) {
      onClose();
      reset();
      await getArchitectures(true);
    }
  };

  // required for ref sharing with react-hook-form: https://www.react-hook-form.com/faqs/#Howtosharerefusage
  const { ref, ...rest } = register("name", {
    required: "Name is required",
    maxLength: {
      value: 80,
      message: "Name must be at most 80 characters long",
    },
    pattern: {
      value: /^[a-zA-Z0-9-_]+$/,
      message:
        "Name must only contain alphanumeric characters, dashes and underscores",
    },
    onChange: async () => {
      await trigger("name");
    },
  });

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        reset();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose, reset]);

  const [shouldSelectDefaultValue, setShouldSelectDefaultValue] =
    useState(true);

  useEffect(() => {
    if (show) {
      setShouldSelectDefaultValue(true);
    }
  }, [show]);

  return (
    <Modal
      show={show}
      onClose={() => {
        reset();
        onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        onReset={() => {
          reset();
          onClose?.();
        }}
      >
        <Modal.Header>
          Clone Architecture{name ? ` — ${name}` : ""}
        </Modal.Header>
        <Modal.Body>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="clone">
                Supply a new name for your cloned architecture.
              </Label>
            </div>
            <TextInput
              data-1p-ignore
              autoComplete="off"
              id="clone"
              ref={(e) => {
                ref(e);
                if (shouldSelectDefaultValue) {
                  e?.select();
                  setShouldSelectDefaultValue(false);
                }
              }}
              {...rest}
              type="text"
              color={errors.name ? "failure" : undefined}
              helperText={errors.name?.message}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="reset" color="clear" className="dark:text-white">
            Cancel
          </Button>
          <Button
            type="submit"
            color="purple"
            disabled={Object.entries(errors).length > 0}
            isProcessing={isSubmitting}
            processingSpinner={<AiOutlineLoading className="animate-spin" />}
          >
            Clone
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
