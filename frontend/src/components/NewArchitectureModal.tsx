import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useEffect, useReducer, useState } from "react";
import fieldsReducer from "../helpers/reducer";

interface NewArchitectureModalProps {
  onClose?: () => void;
  onSubmit?: (event: SubmitEvent, state: NewArchitectureFormState) => void;
  show: boolean;
}

export interface NewArchitectureFormState {
  name: string;
}

const initialState = {
  name: "",
};

export default function NewArchitectureModal({
  onClose,
  onSubmit,
  show,
}: NewArchitectureModalProps) {
  const [state, dispatch] = useReducer(fieldsReducer, initialState);

  const [reset, setReset] = useState(false);

  useEffect(() => {
    if (reset) {
      dispatch({ field: "name", value: "" });
      setReset(false);
    }
  }, [reset]);

  const onChange = (e: any) => {
    dispatch({ field: e.target.id, value: e.target.value });
  };

  const { name } = state;

  return (
    <Modal
      show={show}
      onClose={() => {
        setReset(true);
        onClose?.();
      }}
    >
      <form>
        <Modal.Header>Create a New Architecture</Modal.Header>
        <Modal.Body>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="name" value="Name" />
            </div>
            <TextInput
              id="name"
              value={name}
              onChange={onChange}
              placeholder="New Architecture"
              required
              type="text"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="submit"
            color="purple"
            onClick={(e: SubmitEvent) => {
              onSubmit?.(e, state);
              setReset(true);
            }}
          >
            Create
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
