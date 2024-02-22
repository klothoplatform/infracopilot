import { Button } from "flowbite-react";
import { useState, type FC, useEffect } from "react";
import { FaRepeat } from "react-icons/fa6";
import StacksTable from "../../components/deployment/StacksTable";
import useApplicationStore from "../store/ApplicationStore";
import { BigStackButtonAndModal } from "../../components/deployment/NewStackBigButton";
import CreateStackModal from "../../components/deployment/CreateStackModal";

export const StacksPage: FC = () => {
  const { stacks, listStacks } = useApplicationStore();

  const [isLoadingStacks, setIsLoadingStacks] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isLoadingStacks) {
      setIsLoadingStacks(true);
      listStacks();
    }
  }, []);

  return (
    <div className="flex size-full grow flex-col gap-6 px-4 py-6">
      <div
        className={
          "flex min-h-fit w-full flex-col gap-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-900"
        }
      >
        <h2 className={"mb-2 text-lg font-semibold dark:text-white"}>
          Create a new stack
        </h2>
        <BigStackButtonAndModal setShowCreateStackModal={setShowModal} />
      </div>
      <div
        className={
          "bg-white-100 flex w-full grow flex-col gap-2 overflow-hidden rounded-lg p-4 dark:bg-gray-800"
        }
      >
        <h2 className={"mb-2 text-lg font-semibold dark:text-white"}>Stacks</h2>
        <div className="size-full overflow-auto p-4">
          <StacksTable stacks={stacks} />
          {retryMessage && (
            <div className="my-4 flex w-full items-baseline justify-start dark:text-white">
              <div className="px-6 text-center text-sm">{retryMessage}</div>
              <Button
                size="xs"
                color="light"
                onClick={() => {
                  setRetryMessage("");
                  setIsLoadingStacks(false);
                  listStacks();
                }}
              >
                <FaRepeat className={"mr-2"} />
                Reload
              </Button>
            </div>
          )}
          {showModal && (
            <CreateStackModal
              onClose={() => {
                setShowModal(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const stacksTable: FC = () => {
  return <></>;
};
