import { type FC, useState } from "react";
import { Button } from "flowbite-react";
import NewArchitectureModal from "./NewArchitectureModal";
import { BiPlus } from "react-icons/bi";

interface NewArchitectureButtonProps {
  disabled?: boolean;
  onClick?: () => void;
}

const NewArchitectureBigButton: FC<NewArchitectureButtonProps> = (
  props: NewArchitectureButtonProps,
) => {
  return (
    <Button
      color={"purple"}
      className="h-[6rem] w-[5rem] rounded-lg p-8 drop-shadow-md"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      <BiPlus className="h-[2.5rem] w-[2.5rem]" />
    </Button>
  );
};

interface ArchitectureButtonAndModalProps {
  disabled?: boolean;
}

export const BigArchitectureButtonAndModal: FC<
  ArchitectureButtonAndModalProps
> = (props: ArchitectureButtonAndModalProps) => {
  const [showCreateArchitectureModal, setShowCreateArchitectureModal] =
    useState(false);
  return (
    <>
      <NewArchitectureBigButton
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
