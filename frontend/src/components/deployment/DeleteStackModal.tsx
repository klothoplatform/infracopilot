import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import deleteStack from "../../api/DeleteStack";
import { UIError } from "../../shared/errors";
import { AiOutlineLoading } from "react-icons/ai";
import { FormFooter } from "../FormFooter";

interface DeleteStackModalProps {
  onClose: () => void;
  show: boolean;
  id: string;
  name?: string;
}

export interface DeleteStackFormState {
  confirmation: string;
}

export default function DeleteStackModal({
  onClose,
  show,
  id,
  name,
}: DeleteStackModalProps) {
  const {
    reset,
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<DeleteStackFormState>();

  const { getIdToken, listStacks, addError, architecture, environmentVersion } =
    useApplicationStore();
  const watchConfirmation = watch("confirmation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onSubmit = async () => {
    let success = false;
    setIsSubmitting(true);
    try {
      await deleteStack({
        architecture: architecture.id,
        environmentVersion: environmentVersion.id,
        name: id,
        idToken: await getIdToken(),
      });
      success = true;
    } catch (e: any) {
      addError(
        new UIError({
          errorId: "DeleteStackModal:Submit",
          message: `Failed to delete Stack: ${name}`,
          messageComponent: (
            <span>
              Failed to delete Stack: <strong>{name}</strong>
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
      await listStacks();
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
        <Modal.Header>Delete Stack{name ? ` — ${name}` : ""}</Modal.Header>
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
          <FormFooter>
            <div className="flex gap-2">
              <Button type="reset" color="clear" className="dark:text-white">
                Cancel
              </Button>
              <Button
                type="submit"
                color="purple"
                disabled={
                  Object.entries(errors).length > 0 || !watchConfirmation
                }
                isProcessing={isSubmitting}
                processingSpinner={
                  <AiOutlineLoading className="animate-spin" />
                }
              >
                Delete
              </Button>
            </div>
          </FormFooter>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
