import type { FC } from "react";
import React, { useCallback, useState } from "react";
import { FaClone } from "react-icons/fa6";
import { Button } from "flowbite-react";
import useApplicationStore from "../../pages/store/ApplicationStore";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "../Tooltip";
import { AiOutlineLoading } from "react-icons/ai";
import { WorkingOverlay } from "../WorkingOverlay";

export const CloneCurrentArchitectureButton: FC<{
  small?: boolean;
}> = ({ small }) => {
  const {
    architecture,
    isAuthenticated: storeIsAuthenticated,
    loginWithRedirect,
    cloneArchitecture,
  } = useApplicationStore();
  const { id, name } = architecture;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [workingMessage, setWorkingMessage] = useState<string | undefined>(
    undefined,
  );

  const onClick = useCallback(async () => {
    setIsSubmitting(true);
    if (!storeIsAuthenticated) {
      setWorkingMessage("Logging in...");
      await loginWithRedirect({
        action: "clone",
        architecture: {
          id,
          name,
        },
      });
      return;
    } else {
      try {
        const newId = await cloneArchitecture(`Copy of ${name}`, id);
        console.log("newId", newId);
        if (newId) {
          navigate(`/editor/${newId}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [
    cloneArchitecture,
    id,
    loginWithRedirect,
    name,
    navigate,
    storeIsAuthenticated,
  ]);

  const content = "Make a copy";
  return (
    <>
      <Tooltip content={content} disabled={!small}>
        <Button
          onClick={onClick}
          color={"purple"}
          isProcessing={isSubmitting}
          disabled={isSubmitting}
          processingSpinner={<AiOutlineLoading className="animate-spin" />}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            {!isSubmitting && <FaClone />}
            {!small && <span>{content}</span>}
          </div>
        </Button>
      </Tooltip>
      <WorkingOverlay message={workingMessage} show={!!workingMessage} />
    </>
  );
};
