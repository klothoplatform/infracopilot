import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";
import createArchitecture from "../api/CreateArchitecture";
import useApplicationStore from "../views/store/ApplicationStore";
import { useNavigate } from "react-router-dom";

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

  const { idToken, user } = useApplicationStore();
  const navigate = useNavigate();

  let onSubmit = useCallback(
    async (state: NewArchitectureFormState) => {
      onClose();
      const { id } = await createArchitecture({
        name: state.name,
        owner: user?.sub ?? "public",
        engineVersion: 1,
        idToken: idToken,
      });
      navigate(`/editor/${id}`);
    },
    [idToken, navigate, onClose, user],
  );

  // required for ref sharing with react-hook-form: https://www.react-hook-form.com/faqs/#Howtosharerefusage
  const { ref, ...rest } = register("name", {
    required: "Name is required",
    maxLength: {
      value: 80,
      message: "Name must be at most 80 characters long",
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
              id="name"
              ref={(e) => {
                ref(e);
                if (shouldSelectDefaultValue) {
                  e?.select();
                  setShouldSelectDefaultValue(false);
                }
              }}
              {...rest}
              defaultValue="Untitled Architecture"
              type="text"
              color={errors.name ? "failure" : undefined}
              helperText={errors.name?.message}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" color="purple">
            Create
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
