import { Button, Label, Modal, TextInput } from "flowbite-react";
import type { FC } from "react";
import { useReducer } from "react";

interface NewArchitectureModalProps {
  onClose?: () => void;
  onSubmit?: (state: NewArchitectureFormState) => void;
  show: boolean;
}

export interface NewArchitectureFormState {
  name: string;
}

const initialState = {
  name: "",
};

function reducer(state: any, { field, value }: any) {
  return {
    ...state,
    [field]: value,
  };
}

export default function NewArchitectureModal({
  onClose,
  onSubmit,
  show,
}: NewArchitectureModalProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const onChange = (e: any) => {
    dispatch({ field: e.target.id, value: e.target.value });
  };

  const { name } = state;

  return (
    <Modal show={show} onClose={onClose}>
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
          <Button type="submit" onClick={(e: SubmitEvent) => onSubmit?.(state)}>
            Create
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
