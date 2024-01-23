import type { FC } from "react";
import type { TooltipProps } from "flowbite-react";
import { Tooltip as FBTooltip } from "flowbite-react";

/**
 *
 * @param disabled
 * @param props
 * @constructor
 */
export const Tooltip: FC<TooltipProps & { disabled?: boolean }> = ({
  disabled,
  ...props
}) => {
  if (disabled) {
    return <>{props.children}</>;
  }
  return <FBTooltip {...props}>{props.children}</FBTooltip>;
};
