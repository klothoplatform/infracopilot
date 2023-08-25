import React from "react";
import ReactDOM from "react-dom/client";
import "./index.scss";
import reportWebVitals from "./reportWebVitals";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ArchitectureEditor from "./views/ArchitectureEditor/ArchitectureEditor";
import { createTheme, ThemeProvider } from "@mui/material";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

declare module "@mui/material/styles" {
  interface TypographyVariants {
    resourceLabel: React.CSSProperties;
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    resourceLabel?: React.CSSProperties;
  }
}

// Update the Typography's variant prop options
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    resourceLabel: true;
  }
}

const theme = createTheme({
  typography: {
    resourceLabel: {
      fontSize: "10px",
    },
  },
  components: {
    MuiTypography: {
      defaultProps: {
        variantMapping: {
          resourceLabel: "span",
        },
      },
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <ArchitectureEditor />,
  },
]);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
