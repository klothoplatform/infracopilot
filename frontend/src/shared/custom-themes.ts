/*
    Reusable non-default flowbite component themes can be defined here.
 */

import type { CustomFlowbiteTheme } from "flowbite-react";

export const OutlinedAlert: CustomFlowbiteTheme["alert"] = {
  wrapper:
    "max-w-full flex items-center [&_div]:max-w-full [&_div]:overflow-hidden",
  color: {
    info: "text-cyan-800 border border-cyan-300 rounded-lg bg-cyan-50 dark:bg-gray-800 dark:text-cyan-400 dark:border-cyan-800",
    failure:
      "text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800",
    success:
      "text-green-800 border border-green-300 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-800",
    warning:
      "text-yellow-800 border border-yellow-300 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-400 dark:border-yellow-800",
    dark: "text-gray-800 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
  },
};
