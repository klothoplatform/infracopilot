import type { CustomFlowbiteTheme } from "flowbite-react";

const flowbiteTheme: CustomFlowbiteTheme = {
  alert: {
    wrapper:
      "max-w-full flex items-center [&_div]:max-w-full [&_div]:overflow-hidden",
    color: {
      info: "text-blue-800 bg-blue-100 border-blue-200 dark:text-blue-800 dark:bg-blue-200 dark:border-blue-300",
    },
  },
  badge: {
    root: {
      color: {
        info: "bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-800 group-hover:bg-blue-200 dark:group-hover:bg-blue-300",
        primary:
          "bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-800 group-hover:bg-blue-200 dark:group-hover:bg-blue-300",
      },
      size: {
        xl: "px-3 py-2 text-base rounded-md",
      },
    },
    icon: {
      off: "rounded-full px-2 py-1",
    },
  },
  button: {
    base: "group flex items-stretch items-center justify-center p-0.5 text-center relative focus:z-10 focus:outline-none",
    color: {
      red: "text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800",
      gray: "text-gray-900 bg-white border border-gray-200 enabled:hover:bg-gray-100 enabled:hover:text-blue-700 :ring-blue-700 focus:text-blue-700 dark:bg-transparent dark:text-gray-400 dark:border-gray-600 dark:enabled:hover:text-white dark:enabled:hover:bg-gray-700 focus:ring-2",
      info: "text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800",
      purple:
        "text-white bg-primary-600 border border-transparent enabled:hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 dark:bg-primary-700 dark:enabled:hover:bg-primary-600 dark:focus:ring-primary-800",
    },
    inner: {
      base: "flex items-center transition-all duration-200",
    },
    outline: {
      color: {
        gray: "border border-gray-200 dark:border-gray-500",
        purple: "border-0 border-primary-600 [&>*]:hover:text-white",
      },
    },
  },
  card: {
    root: {
      children: "flex h-full flex-col justify-center gap-4",
    },
  },
  checkbox: {
    root: {
      color: {
        default:
          "focus:ring-primary-600 dark:ring-offset-primary-600 dark:focus:ring-primary-600 text-primary-600 dark:focus:border-white",
      },
    },
  },
  modal: {
    content: {
      inner: "relative rounded-lg bg-white shadow dark:bg-gray-800",
    },
    header: {
      base: "flex items-start justify-between rounded-t px-5 pt-5",
    },
  },
  navbar: {
    root: {
      base: "relative z-1 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700",
    },
  },
  sidebar: {
    root: {
      base: "flex relative top-0 z-20 flex-col flex-shrink-0 h-full duration-75 border-r border-gray-200 lg:flex transition-width dark:border-gray-700",
      inner:
        "h-full overflow-y-auto overflow-x-hidden rounded bg-gray-50 py-4 px-3 dark:bg-gray-800",
    },
    item: {
      base: "flex items-center justify-center rounded-lg p-2 text-base font-medium text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700",
    },
    collapse: {
      button:
        "group flex w-full items-center rounded-lg p-2 text-base font-medium text-gray-900 transition duration-75 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700",
    },
  },
  textarea: {
    base: "block w-full text-sm p-4 rounded-lg border disabled:cursor-not-allowed disabled:opacity-50",
  },
  textInput: {
    field: {
      input: {
        colors: {
          info: "border-blue-500 bg-blue-50 text-blue-900 placeholder-blue-700 focus:border-blue-500 focus:ring-blue-500 dark:border-blue-400 dark:bg-blue-100 dark:focus:border-blue-500 dark:focus:ring-blue-500",
        },
        withIcon: {
          on: "!pl-12",
        },
      },
    },
  },
  toggleSwitch: {
    toggle: {
      checked: {
        color: {
          blue: "bg-blue-700 border-blue-700",
        },
      },
    },
  },
  tooltip: {
    // max-w-max is required to avoid tooltip causing ResizeObserver loop limit exceeded error
    base: "absolute inline-block z-10 rounded-lg py-2 px-3 text-sm font-medium shadow-sm max-w-max w-fit",
    content: "relative z-20 max-w-max w-max",
    target: "",
  },
  table: {
    row: {
      hovered:
        "group/row hover:bg-primary-100 dark:hover:bg-primary-700 dark:hover:text-white bg-white border-gray-300 dark:border-gray-500 dark:bg-gray-700",
      striped:
        "group/row odd:bg-white even:bg-gray-50 odd:dark:bg-gray-700 even:dark:bg-gray-800 bg-white border-gray-300 dark:border-gray-500 dark:bg-gray-600",
    },
  },
};
export default flowbiteTheme;
