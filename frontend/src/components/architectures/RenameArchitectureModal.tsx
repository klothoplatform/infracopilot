import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import modifyArchitecture from "../../api/ModifyArchitecture";
import { UIError } from "../../shared/errors";

interface ModifyArchitectureModalProps {
  onClose: () => void;
  show: boolean;
  id: string;
  name: string;
}

export interface ModifyArchitectureFormState {
  name: string;
}

export default function NewArchitectureModal({
  onClose,
  show,
  id,
  name,
}: ModifyArchitectureModalProps) {
  const {
    reset,
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<ModifyArchitectureFormState>({ defaultValues: { name: name } });

  const { getIdToken, getArchitectures, addError } = useApplicationStore();

  const onSubmit = async (state: ModifyArchitectureFormState) => {
    let success = false;
    try {
      await modifyArchitecture({
        name: state.name,
        id: id,
        idToken: await getIdToken(),
      });
      success = true;
    } catch (e: any) {
      addError(
        new UIError({
          errorId: "ModifyArchitectureModal:Submit",
          message: `Failed to modify architecture: ${name}`,
          messageComponent: (
            <span>
              Failed to modify architecture: <strong>{name}</strong>
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
    }
    if (success) {
      await getArchitectures(true);
      onClose();
    }
  };

  // required for ref sharing with react-hook-form: https://www.react-hook-form.com/faqs/#Howtosharerefusage
  const { ref, ...rest } = register("name", {
    required: "Name is required",
    maxLength: {
      value: 80,
      message: "Name must be at most 80 characters long",
    },
    minLength: {
      value: 1,
      message: "Name must be at least 1 character long",
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
        onSubmit={handleSubmit((state) => {
          onSubmit(state);
          reset();
        })}
        onReset={() => {
          reset();
          onClose?.();
        }}
      >
        <Modal.Header>Rename Architecture</Modal.Header>
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
          >
            Rename
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
