import { type FC, useState } from "react";
import { Button } from "flowbite-react";
import { FaFileCirclePlus } from "react-icons/fa6";
import NewArchitectureModal from "./NewArchitectureModal";

interface NewArchitectureButtonProps {
  disabled?: boolean;
  onClick?: () => void;
}

const NewArchitectureButton: FC<NewArchitectureButtonProps> = (
  props: NewArchitectureButtonProps,
) => {
  return (
    <div className="flex">
      <Button
        color={"purple"}
        className="mr-2 flex gap-1"
        onClick={props.onClick}
        disabled={props.disabled}
      >
        <FaFileCirclePlus className="mr-1" />
        <p>New Architecture</p>
      </Button>
    </div>
  );
};

interface ArchitectureButtonAndModalProps {
  disabled?: boolean;
}

export const ArchitectureButtonAndModal: FC<ArchitectureButtonAndModalProps> = (
  props: ArchitectureButtonAndModalProps,
) => {
  const [showCreateArchitectureModal, setShowCreateArchitectureModal] =
    useState(false);
  return (
    <>
      <NewArchitectureButton
        onClick={() => {
          setShowCreateArchitectureModal(true);
        }}
        disabled={props.disabled}
      />
      <NewArchitectureModal
        onClose={() => {
          setShowCreateArchitectureModal(false);
        }}
        show={showCreateArchitectureModal}
      />
    </>
  );
};
