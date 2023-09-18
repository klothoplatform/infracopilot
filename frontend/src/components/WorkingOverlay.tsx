import type { FC } from "react";
import React from "react";
import { Spinner } from "flowbite-react";

type WorkingOverlayProps = {
  show: boolean;
};
export const WorkingOverlay: FC<WorkingOverlayProps> = ({ show }) => {
  return (
    <div
      title={"Working..."}
      className={
        "fixed inset-0 z-[1000] flex items-center justify-center bg-gray-500/40 dark:bg-black/40"
      }
      style={{
        display: show ? "flex" : "none",
      }}
    >
      {/* spinner doesn't seem to spin when toggling from the display without applying animate-spin to its parent */}
      <span className="animate-spin">
        <Spinner color={"purple"} size={"xl"} />
      </span>
    </div>
  );
};
