import { type FC, useState } from "react";
import type { CustomFlowbiteTheme } from "flowbite-react";
import { Button } from "flowbite-react";
import NewArchitectureModal from "./NewArchitectureModal";
import { BiPlus } from "react-icons/bi";

interface NewArchitectureButtonProps {
  disabled?: boolean;
  onClick?: () => void;
}

const buttonTheme: CustomFlowbiteTheme["button"] = {
  base: "group flex items-stretch items-center justify-center p-0.5 text-center font-medium relative focus:z-10 focus:outline-none",
  fullSized: "w-full h-full",
  inner: {
    base: "flex items-stretch items-center transition-all duration-200 w-full h-full",
  },
};

const NewArchitectureBigButton: FC<NewArchitectureButtonProps> = (
  props: NewArchitectureButtonProps,
) => {
  return (
    <div className="h-[8rem] w-[6rem]">
      <Button
        aria-label="Create a New Architecture"
        theme={buttonTheme}
        className={
          "[&>span]:text-primary-600 [&>span]:hover:text-white [&>span]:dark:text-primary-600 [&>span]:dark:hover:text-white"
        }
        color={"purple"}
        onClick={props.onClick}
        disabled={props.disabled}
        outline
        fullSized
      >
        <BiPlus className="size-[3rem]" />
      </Button>
    </div>
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
