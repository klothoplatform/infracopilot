import { Flowbite } from "flowbite-react";
import type { FC, PropsWithChildren } from "react";
import theme from "../flowbite-theme";

const FlowbiteWrapper: FC<PropsWithChildren> = ({ children }) => {
  const storedTheme = localStorage.getItem("theme");
  const dark =
    storedTheme === "dark" ||
    (storedTheme === null &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  return (
    <Flowbite theme={{ mode: dark ? "dark" : "light", theme }}>
      {children}
    </Flowbite>
  );
};

export default FlowbiteWrapper;
