// create themes with Fluent UI Theme Designer https://fluentuipr.z22.web.core.windows.net/heads/master/theming-designer/index.html

import { createTheme } from "@fluentui/react";

export const chatThemeDark = createTheme({
  palette: {
    themePrimary: "#7c3aed",
    themeLighterAlt: "#f9f7fe",
    themeLighter: "#e9ddfc",
    themeLight: "#d6c1fa",
    themeTertiary: "#ae85f4",
    themeSecondary: "#8a4fef",
    themeDarkAlt: "#6f33d5",
    themeDark: "#5d2bb4",
    themeDarker: "#452085",
    neutralLighterAlt: "#101725",
    neutralLighter: "#101725",
    neutralLight: "#0f1623",
    neutralQuaternaryAlt: "#0e1421",
    neutralQuaternary: "#0e131f",
    neutralTertiaryAlt: "#0d131e",
    neutralTertiary: "#a19f9d",
    neutralSecondary: "#605e5c",
    neutralSecondaryAlt: "#8a8886",
    neutralPrimaryAlt: "#3b3a39",
    neutralPrimary: "#e5e7eb",
    neutralDark: "#201f1e",
    black: "#000000",
    white: "#1f2937",
    blueDark: "#452085",
    blueMid: "#7c3aed",
    blue: "#7c3aed",
    blueLight: "#d6c1fa",
  },
});

export const chatThemeLight = createTheme({
  palette: {
    themePrimary: "#7c3aed",
    themeLighterAlt: "#050209",
    themeLighter: "#140926",
    themeLight: "#251147",
    themeTertiary: "#4a228e",
    themeSecondary: "#6c32d1",
    themeDarkAlt: "#874cef",
    themeDark: "#9966f1",
    themeDarker: "#b38df5",
    neutralLighterAlt: "#f1f2f3",
    neutralLighter: "#edeeef",
    neutralLight: "#e3e4e5",
    neutralQuaternaryAlt: "#d4d5d6",
    neutralQuaternary: "#cacbcc",
    neutralTertiaryAlt: "#c2c3c4",
    neutralTertiary: "#a19f9d",
    neutralSecondary: "#d1d5db",
    neutralSecondaryAlt: "#8a8886",
    neutralPrimaryAlt: "#3b3a39",
    neutralPrimary: "#323130",
    neutralDark: "#201f1e",
    black: "#000000",
    white: "#f9fafb",
  },
});
