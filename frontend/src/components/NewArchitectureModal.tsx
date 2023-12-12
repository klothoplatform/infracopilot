import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";
import createArchitecture from "../api/CreateArchitecture";
import useApplicationStore from "../pages/store/ApplicationStore";
import { useNavigate } from "react-router-dom";
import { UIError } from "../shared/errors";
import { AiOutlineLoading } from "react-icons/ai";

interface NewArchitectureModalProps {
  onClose: () => void;
  setIsLoadingArchitecture?: (isLoading: boolean) => void;
  show: boolean;
}

export interface NewArchitectureFormState {
  name: string;
}

export default function NewArchitectureModal({
  onClose,
  show,
}: NewArchitectureModalProps) {
  const {
    reset,
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<NewArchitectureFormState>();

  const { getIdToken, user, resetEditorState, addError } =
    useApplicationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  let onSubmit = useCallback(
    async (state: NewArchitectureFormState) => {
      let id;
      setIsSubmitting(true);
      try {
        const architecture = await createArchitecture({
          name: state.name,
          owner: user?.sub ?? "public",
          engineVersion: 1,
          idToken: await getIdToken(),
        });
        id = architecture.id;
      } catch (e: any) {
        addError(
          new UIError({
            errorId: "NewArchitectureModal:Submit",
            message: "Failed to create architecture!",
            cause: e as Error,
          }),
        );
      }
      setIsSubmitting(false);
      onClose();

      if (id) {
        try {
          resetEditorState();
          navigate(`/editor/${id}`);
        } catch (e: any) {
          addError(
            new UIError({
              errorId: "NewArchitectureModal:Submit",
              message: "Loading new architecture failed!",
              cause: e,
            }),
          );
        }
      }
    },
    [addError, getIdToken, navigate, onClose, resetEditorState, user?.sub],
  );

  // required for ref sharing with react-hook-form: https://www.react-hook-form.com/faqs/#Howtosharerefusage
  const { ref, ...rest } = register("name", {
    required: "Name is required",
    maxLength: {
      value: 80,
      message: "Name must be at most 80 characters long",
    },
    // Remove any spaces
    pattern: {
      value: /^[a-zA-Z0-9-_]+$/,
      message:
        "Name must only contain alphanumeric characters, dashes and underscores",
    },
    onChange: async () => {
      await trigger("name");
    },
  });

  const [shouldSelectDefaultValue, setShouldSelectDefaultValue] =
    useState(true);

  useEffect(() => {
    if (show) {
      setShouldSelectDefaultValue(true);
    }
  }, [show]);

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

  return (
    <Modal
      show={show}
      onClose={() => {
        reset();
        onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit((state) => {
          onSubmit(state);
          reset();
        })}
      >
        <Modal.Header>Create a New Architecture</Modal.Header>
        <Modal.Body>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="name" value="Name" />
            </div>
            <TextInput
              data-1p-ignore
              autoComplete="off"
              id="name"
              ref={(e) => {
                ref(e);
                if (shouldSelectDefaultValue) {
                  e?.select();
                  setShouldSelectDefaultValue(false);
                }
              }}
              {...rest}
              defaultValue="UntitledArchitecture"
              type="text"
              color={errors.name ? "failure" : undefined}
              helperText={errors.name?.message}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="submit"
            color="purple"
            disabled={Object.entries(errors).length > 0}
            isProcessing={isSubmitting}
            processingSpinner={<AiOutlineLoading className="animate-spin" />}
          >
            Create
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
