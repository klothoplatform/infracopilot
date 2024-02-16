import type { CustomFlowbiteTheme } from "flowbite-react";

const flowbiteTheme: CustomFlowbiteTheme = {
  alert: {
    wrapper:
      "max-w-full flex items-center [&_div]:max-w-full [&_div]:overflow-hidden",
    color: {
      info: "text-cyan-800 border-cyan-300 rounded-lg bg-cyan-50 dark:bg-gray-800 dark:text-cyan-400 dark:border-cyan-800",
      failure:
        "text-red-800 border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800",
      success:
        "text-green-800 border-green-300 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-800",
      warning:
        "text-yellow-800 border-yellow-300 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-400 dark:border-yellow-800",
      dark: "text-gray-800 border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
    },
    closeButton: {
      color: {
        info: "bg-cyan-50 text-cyan-500 rounded-lg focus:ring-2 focus:ring-cyan-400 hover:bg-cyan-200 dark:bg-gray-800 dark:text-cyan-400 dark:hover:bg-gray-700",
        failure:
          "bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 hover:bg-red-200 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700",
        success:
          "bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 hover:bg-green-200 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700",
        warning:
          "bg-yellow-50 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 hover:bg-yellow-200 dark:bg-gray-800 dark:text-yellow-400 dark:hover:bg-gray-700",
        dark: "bg-gray-50 text-gray-500 rounded-lg focus:ring-2 focus:ring-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
      },
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
    base: "group flex items-stretch items-center justify-center p-0.5 text-center relative focus:outline-none",
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
        "h-full overflow-y-auto overflow-x-hidden rounded bg-gray-50 p-4 dark:bg-gray-800",
    },
    item: {
      base: "flex items-center justify-center rounded-lg p-2 text-base font-medium text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 cursor-pointer",
      content: {
        base: "flex-1 px-3 whitespace-nowrap",
      },
      active:
        "bg-gray-100 dark:bg-gray-700 pr-2 pl-0 before:relative before:-left-2 before:mr-1 before:h-6 before:content-[' '] before:inline-block before:bg-primary-600 dark:before:bg-primary-500 before:w-1 before:rounded-lg",
    },
    collapse: {
      button:
        "group flex w-full items-center rounded-lg p-2 text-base font-medium text-gray-900 transition duration-75 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700",
    },
  },
  textarea: {
    base: "block w-full text-sm p-4 rounded-lg border disabled:cursor-not-allowed disabled:opacity-50",
  },
  helperText: {
    root: {
      colors: {
        purple: "text-purple-600 dark:text-purple-500",
        gray: "text-gray-500 dark:text-gray-400",
        info: "text-cyan-600 dark:text-cyan-500",
        success: "text-green-600 dark:text-green-500",
        failure: "text-red-600 dark:text-red-500",
        warning: "text-yellow-600 dark:text-yellow-500",
      },
    },
  },
  textInput: {
    field: {
      base: "relative w-full",
      input: {
        base: "block w-full border disabled:cursor-not-allowed disabled:opacity-50 text-green-500",
        colors: {
          success:
            "focus:outline-none focus:ring-1 bg-green-50 border-green-500 text-green-900 dark:text-green-400 placeholder-green-700 dark:placeholder-green-500 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-green-500",
          failure:
            "focus:outline-none focus:ring-1 bg-red-50 border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 dark:bg-gray-700 focus:border-red-500 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500",
          warning:
            "focus:outline-none focus:ring-1 bg-yellow-50 border-yellow-500 text-yellow-900 placeholder-yellow-700 focus:ring-yellow-500 dark:bg-gray-700 focus:border-yellow-500 dark:text-yellow-500 dark:placeholder-yellow-500 dark:border-yellow-500",
          info: "focus:outline-none focus:ring-1 bg-blue-50 border-blue-500 text-blue-900 placeholder-blue-700 focus:ring-blue-500 dark:bg-gray-700 focus:border-blue-500 dark:text-blue-500 dark:placeholder-blue-500 dark:border-blue-500",
          gray: "bg-gray-50 border-gray-300 text-gray-900 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500",
          purple:
            "focus:outline-none focus:ring-1 bg-purple-50 border-purple-500 text-purple-900 placeholder-purple-700 focus:ring-purple-500 dark:bg-gray-700 focus:border-purple-500 dark:text-purple-500 dark:placeholder-purple-500 dark:border-purple-500",
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
