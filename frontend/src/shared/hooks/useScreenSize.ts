import { useEffect, useState } from "react";
import { screenSizeIsAtMost } from "../../helpers/screen-size";

interface ScreenSize {
  isSmallScreen: boolean;
  isXSmallScreen: boolean;
}

/**
 * A hook that returns whether the screen size is small or not.
 *
 * For our purposes, a small screen is defined as a screen that is smaller than the "lg" breakpoint.
 */
export const useScreenSize = (): ScreenSize => {
  const [isSmallScreen, setIsSmallScreen] = useState(screenSizeIsAtMost("md"));
  const [isXSmallScreen, setIsXSmallScreen] = useState(
    screenSizeIsAtMost("sm"),
  );

  useEffect(() => {
    function handleResize() {
      setIsSmallScreen(screenSizeIsAtMost("md"));
      setIsXSmallScreen(screenSizeIsAtMost("sm"));
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return { isSmallScreen, isXSmallScreen };
};
