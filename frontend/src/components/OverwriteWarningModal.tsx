import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import useApplicationStore from "../pages/store/ApplicationStore";

interface OverwriteWarningModalProps {
  name: string;
}

export interface OverwriteWarningFormState {
  confirmation: string;
}

export default function OverwriteWarningModal({
  name,
}: OverwriteWarningModalProps) {
  const {
    reset,
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<OverwriteWarningFormState>();

  const {
    attemptedOverwrite,
    willOverwriteState,
    canOverwriteState,
    applyConstraints,
    clearAttemptedOverwrite,
  } = useApplicationStore();

  const watchConfirmation = watch("confirmation");
  const show = willOverwriteState && !canOverwriteState && attemptedOverwrite

  const onSubmit = async () => {
    await applyConstraints(undefined, true);
    reset();
  }

  const onClose = () => {
    clearAttemptedOverwrite();
    reset();
  }

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
          Overwrite state for {name ? ` — ${name}` : ""}
        </Modal.Header>
        <Modal.Body>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="confirmation">
                Type <i>confirm</i> to perform action
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
          >
            Overwrite
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
