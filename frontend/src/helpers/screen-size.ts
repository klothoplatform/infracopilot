import isBrowser from "./is-browser";

export function isSmallScreen(): boolean {
  return isBrowser() && window.innerWidth < 768;
}

export function screenSizeIsAtLeast(
  size: "xs" | "sm" | "md" | "lg" | "xl" | "xxl",
): boolean {
  if (!isBrowser()) {
    return false;
  }

  switch (size) {
    case "xs":
      return window.innerWidth >= 0;
    case "sm":
      return window.innerWidth >= 640;
    case "md":
      return window.innerWidth >= 768;
    case "lg":
      return window.innerWidth >= 1024;
    case "xl":
      return window.innerWidth >= 1280;
    case "xxl":
      return window.innerWidth >= 1536;
  }
}

export function screenSizeIsAtMost(
  size: "xs" | "sm" | "md" | "lg" | "xl" | "xxl",
): boolean {
  if (!isBrowser()) {
    return false;
  }

  switch (size) {
    case "xs":
      return window.innerWidth < 640;
    case "sm":
      return window.innerWidth < 768;
    case "md":
      return window.innerWidth < 1024;
    case "lg":
      return window.innerWidth < 1280;
    case "xl":
      return window.innerWidth < 1536;
    case "xxl":
      return true;
  }
}
