import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import deleteArchitecture from "../../api/DeleteArchitecture";
import { UIError } from "../../shared/errors";
import { AiOutlineLoading } from "react-icons/ai";

interface DeleteArchitectureModalProps {
  onClose: () => void;
  show: boolean;
  id: string;
  name?: string;
}

export interface DeleteArchitectureFormState {
  confirmation: string;
}

export default function DeleteArchitectureModal({
  onClose,
  show,
  id,
  name,
}: DeleteArchitectureModalProps) {
  const {
    reset,
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<DeleteArchitectureFormState>();

  const { getIdToken, getArchitectures, addError } = useApplicationStore();
  const watchConfirmation = watch("confirmation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onSubmit = async () => {
    let success = false;
    setIsSubmitting(true);
    try {
      await deleteArchitecture({
        id: id,
        idToken: await getIdToken(),
      });
      success = true;
    } catch (e: any) {
      addError(
        new UIError({
          errorId: "DeleteArchitectureModal:Submit",
          message: `Failed to delete architecture: ${name}`,
          messageComponent: (
            <span>
              Failed to delete architecture: <strong>{name}</strong>
            </span>
          ),
          cause: e,
          data: {
            id,
          },
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
    if (success) {
      onClose();
      await getArchitectures(true);
    }
  };

  // required for ref sharing with react-hook-form: https://www.react-hook-form.com/faqs/#Howtosharerefusage
  const { ref, ...rest } = register("confirmation", {
    required: "Please type confirm to delete",
    // must equal the string confirm
    validate: (value) => value === "confirm",
    onChange: async () => {
      await trigger("confirmation");
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
          Delete Architecture{name ? ` — ${name}` : ""}
        </Modal.Header>
        <Modal.Body>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="confirmation">
                Type <i>confirm</i> to delete
              </Label>
            </div>
            <TextInput
              data-1p-ignore
              autoComplete="off"
              id="confirmation"
              ref={(e) => {
                ref(e);
                if (shouldSelectDefaultValue) {
                  e?.select();
                  setShouldSelectDefaultValue(false);
                }
              }}
              {...rest}
              placeholder="confirm"
              type="text"
              color={errors.confirmation ? "failure" : undefined}
              helperText={errors.confirmation?.message}
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
            disabled={Object.entries(errors).length > 0 || !watchConfirmation}
            isProcessing={isSubmitting}
            processingSpinner={<AiOutlineLoading className="animate-spin" />}
          >
            Delete
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
