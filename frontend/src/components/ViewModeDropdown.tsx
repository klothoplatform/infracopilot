import type { FC } from "react";
import React from "react";
import useApplicationStore from "../pages/store/ApplicationStore";
import { HiChevronDown, HiOutlineEye, HiOutlinePencil } from "react-icons/hi2";
import type { IconType } from "react-icons";
import { Button, Dropdown } from "flowbite-react";
import { Tooltip } from "./Tooltip";
import { ViewMode } from "../shared/EditorViewSettings";
import { HiOutlineCog } from "react-icons/hi";

const modes: { [key: string]: ModeOption } = {
  [ViewMode.Configure]: {
    label: "Configuring",
    value: ViewMode.Configure,
    description: "Configure the architecture",
    Icon: HiOutlineCog,
  },
  [ViewMode.Edit]: {
    label: "Editing",
    value: ViewMode.Edit,
    description: "Make changes to the architecture",
    Icon: HiOutlinePencil,
  },
  [ViewMode.View]: {
    label: "Viewing",
    value: ViewMode.View,
    description: "Inspect and export the architecture",
    Icon: HiOutlineEye,
  },
};

interface ModeOption {
  label: string;
  value: ViewMode;
  description: string;
  Icon: IconType;
}

const ViewModeButton: FC<{
  option: ModeOption;
  arrow?: boolean;
  onClick?: () => void;
}> = ({ option, arrow, onClick }) => {
  return (
    <Button
      theme={{
        size: {
          md: "py-[5px] px-3",
        },
      }}
      outline
      pill
      color={"light"}
      size={"md"}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <option.Icon size={20} />
        {arrow && <HiChevronDown size={16} />}
      </div>
    </Button>
  );
};

export const ViewModeDropdown: FC = () => {
  const {
    architectureAccess,
    viewSettings: { mode },
    updateViewSettings,
    architecture,
    environmentVersion,
  } = useApplicationStore();

  const selectedOption = modes[mode];

  const onChangeViewMode = (option: ModeOption) => {
    updateViewSettings({ mode: option.value });
  };

  const isDefaultEnvironment =
    environmentVersion?.id === architecture?.defaultEnvironment;
  const modeFilter = (option: ModeOption) =>
    isDefaultEnvironment || option.value !== ViewMode.Edit;

  const dropdown = !architectureAccess?.canWrite ? undefined : (
    <Dropdown
      label="Display mode"
      placement="bottom-start"
      renderTrigger={() => (
        <div>
          <ViewModeButton option={selectedOption} arrow />
        </div>
      )}
    >
      {Object.entries(modes)
        .filter(([_, option]) => modeFilter(option))
        .map(([key, option]) => (
          <Dropdown.Item
            key={key}
            className="flex items-start gap-2"
            onClick={() => onChangeViewMode(option)}
          >
            <option.Icon size={20} />
            <div className="text-left">
              <div className="flex gap-2 font-semibold">{option.label}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {option.description}
              </div>
            </div>
          </Dropdown.Item>
        ))}
    </Dropdown>
  );

  return (
    <Tooltip
      content={`${selectedOption.label} mode`}
      disabled={architectureAccess?.canWrite}
    >
      {dropdown ?? <ViewModeButton option={selectedOption} />}
    </Tooltip>
  );
};
