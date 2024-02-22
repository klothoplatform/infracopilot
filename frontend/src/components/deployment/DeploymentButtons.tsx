import { Button } from "flowbite-react";
import { type FC } from "react";
import { FaDeleteLeft } from "react-icons/fa6";
import { GrDeploy } from "react-icons/gr";
import { IoMdRefresh } from "react-icons/io";

export interface DeploymentButtonsProps {
  onDeploy: () => void;
  onRefresh: () => void;
  onDestroy: () => void;
  disabled?: boolean;
}

export const DeploymentButtons: FC<DeploymentButtonsProps> = (
  props: DeploymentButtonsProps,
) => {
  return (
    <div className="flex h-full items-center justify-center space-x-4">
      <div className="h-[8rem] w-[6rem]">
        <Button
          aria-label="Create a New Architecture"
          className={
            "[&>span]:text-primary-600 [&>span]:hover:text-white [&>span]:dark:text-primary-600 [&>span]:dark:hover:text-white"
          }
          color={"purple"}
          onClick={props.onDeploy}
          outline
          fullSized
          disabled={props.disabled}
        >
          <GrDeploy className="size-[3rem]" />
          Deploy
        </Button>
      </div>
      <div className="h-[8rem] w-[6rem]">
        <Button
          aria-label="Create a New Architecture"
          className={
            "[&>span]:text-primary-600 [&>span]:hover:text-white [&>span]:dark:text-primary-600 [&>span]:dark:hover:text-white"
          }
          color={"purple"}
          onClick={props.onRefresh}
          outline
          fullSized
          disabled={props.disabled}
        >
          <IoMdRefresh className="size-[3rem]" />
          Refresh
        </Button>
      </div>
      <div className="h-[8rem] w-[6rem]">
        <Button
          aria-label="Create a New Architecture"
          className={
            "[&>span]:text-primary-600 [&>span]:hover:text-white [&>span]:dark:text-primary-600 [&>span]:dark:hover:text-white"
          }
          color={"purple"}
          onClick={props.onDestroy}
          outline
          fullSized
          disabled={props.disabled}
        >
          <FaDeleteLeft className="size-[3rem]" />
          Destroy
        </Button>
      </div>
    </div>
  );
};
