import { type FC, useState } from "react";
import { Button } from "flowbite-react";
import { FaFileCirclePlus } from "react-icons/fa6";
import NewArchitectureModal from "./NewArchitectureModal";
import { Tooltip } from "./Tooltip";

interface NewArchitectureButtonProps {
  disabled?: boolean;
  onClick?: () => void;
  small: boolean;
}

const NewArchitectureButton: FC<NewArchitectureButtonProps> = (
  props: NewArchitectureButtonProps,
) => {
  return (
    <Tooltip content="New Architecture" disabled={!props.small}>
      <Button
        color={"purple"}
        className="mr-2 flex gap-1"
        onClick={props.onClick}
        disabled={props.disabled}
      >
        <FaFileCirclePlus className="mr-1" />
        {!props.small && <p>New Architecture</p>}
      </Button>
    </Tooltip>
  );
};

interface ArchitectureButtonAndModalProps {
  disabled?: boolean;
  small: boolean;
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
        small={props.small}
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
