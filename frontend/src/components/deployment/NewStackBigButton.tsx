import { type FC } from "react";
import type { CustomFlowbiteTheme } from "flowbite-react";
import { Button } from "flowbite-react";
import { BiPlus } from "react-icons/bi";

interface NewStackButtonProps {
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

const NewStackBigButton: FC<NewStackButtonProps> = (
  props: NewStackButtonProps,
) => {
  return (
    <div className="h-[8rem] w-[6rem]">
      <Button
        aria-label="Create a New Stack"
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

interface StackButtonAndModalProps {
  disabled?: boolean;
  setShowCreateStackModal: (show: boolean) => void;
}

export const BigStackButtonAndModal: FC<StackButtonAndModalProps> = (
  props: StackButtonAndModalProps,
) => {
  return (
    <>
      <NewStackBigButton
        onClick={() => {
          props.setShowCreateStackModal(true);
        }}
        disabled={props.disabled}
      />
    </>
  );
};
