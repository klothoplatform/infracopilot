import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";

interface NewArchitectureModalProps {
  onClose?: () => void;
  onSubmit?: (state: NewArchitectureFormState) => void;
  show: boolean;
}

export interface NewArchitectureFormState {
  name: string;
}

export default function NewArchitectureModal({
  onClose,
  onSubmit,
  show,
}: NewArchitectureModalProps) {
  const {
    reset,
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<NewArchitectureFormState>();

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
          onSubmit?.(state);
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
              {...register("name", {
                required: "Name is required",
                maxLength: {
                  value: 80,
                  message: "Name must be at most 80 characters long",
                },
                onChange: async () => {
                  await trigger("name");
                },
              })}
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
