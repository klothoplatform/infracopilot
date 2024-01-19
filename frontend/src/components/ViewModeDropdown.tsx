import type { FC } from "react";
import React, { useEffect, useState } from "react";
import useApplicationStore from "../pages/store/ApplicationStore";
import { HiChevronDown, HiOutlineEye, HiOutlinePencil } from "react-icons/hi2";
import type { IconType } from "react-icons";
import { Button, Dropdown } from "flowbite-react";
import { Tooltip } from "./Tooltip";

const modes = {
  edit: {
    label: "Editing",
    value: "edit",
    description: "Make changes to the architecture",
    Icon: HiOutlinePencil,
  },
  view: {
    label: "Viewing",
    value: "view",
    description: "Inspect and export the architecture",
    Icon: HiOutlineEye,
  },
} as { [key: string]: ModeOption };

interface ModeOption {
  label: string;
  value: "edit" | "view";
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
          md: "py-2 px-3",
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
  } = useApplicationStore();

  // const [selectedOption, setSelectedOption] = useState<ModeOption>(modes[mode]);
  const selectedOption = modes[mode];

  const onChangeViewMode = (option: ModeOption) => {
    updateViewSettings({ mode: option.value });
  };

  const dropdown = !architectureAccess?.canWrite ? null : (
    <Dropdown
      label="Display mode"
      placement="bottom-start"
      renderTrigger={() => (
        <div>
          <ViewModeButton option={selectedOption} arrow />
        </div>
      )}
    >
      {Object.entries(modes).map(([key, option]) => (
        <Dropdown.Item
          key={key}
          className="flex items-start gap-2"
          onClick={() => onChangeViewMode(option)}
        >
          <option.Icon size={20} />
          <div className="text-left">
            <div className="flex gap-2 font-semibold">{option.label}</div>
            <div className="text-sm text-gray-500">{option.description}</div>
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
