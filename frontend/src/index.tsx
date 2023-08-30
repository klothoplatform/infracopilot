import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import { createTheme } from "@mui/material";
import App from "./App";

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

const container = document.getElementById("root");

if (!container) {
  throw new Error("React root element doesn't exist!");
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
