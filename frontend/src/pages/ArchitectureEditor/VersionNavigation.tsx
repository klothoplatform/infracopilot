import React, { useEffect, useState } from "react";
import { Panel, ControlButton } from "reactflow";
import { Tooltip } from "flowbite-react";
import { FaUndo, FaRedo } from "react-icons/fa";
import useApplicationStore from "../store/ApplicationStore";
import { WorkingOverlay } from "../../components/WorkingOverlay";

export const VersionNavigator: React.FC = () => {
  const { previousState, nextState, goToNextState, goToPreviousState } =
    useApplicationStore();

  const [navigatingMessage, setNavigatingMessage] = useState("");

  const onUndo = async () => {
    setNavigatingMessage("Undoing Change...");
    await goToPreviousState();
    setNavigatingMessage("");
  };

  const onRedo = async () => {
    setNavigatingMessage("Redoing Change...");
    await goToNextState();
    setNavigatingMessage("");
  };

  return (
    <Panel position="top-left">
      <WorkingOverlay
        show={navigatingMessage != ""}
        message={navigatingMessage}
      />
      <div className="flex gap-1">
        <ControlButton
          title="undo change"
          disabled={previousState === undefined}
          onClick={onUndo}
        >
          <FaUndo />
        </ControlButton>
        <ControlButton
          title="redo change"
          disabled={nextState === undefined}
          onClick={onRedo}
        >
          <FaRedo />
        </ControlButton>
      </div>
    </Panel>
  );
};
