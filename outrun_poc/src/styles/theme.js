// src/styles/theme.js
// Purpose: Global MUI theme aligned with OUTRUN branding

import { createTheme } from "@mui/material/styles";

/*
OUTRUN Branding colour
Bone white: #F4F1EC
Jet black: #0B0B0B
Burnt orange: #C45A2A
Charcoal:#2A2A2A
Moss green: #4F6F52
*/

// Exported for use in components (avoid hardcoding hex)
export const OUTRUN_WHITE = "#F4F1EC";
export const OUTRUN_BURNT = "#C45A2A";
export const OUTRUN_CHARCOAL = "#2A2A2A";
export const OUTRUN_BLACK = "#0B0B0B";
export const OUTRUN_TEXT_PRIMARY = "#F4F1EC";
export const OUTRUN_TEXT_SECONDARY = "#0B0B0B";

const theme = createTheme({
  palette: {
    mode: "dark",

    primary: {
      main: OUTRUN_WHITE,
      contrastText: OUTRUN_TEXT_SECONDARY,
    },

    background: {
      default: OUTRUN_BURNT,
      paper: OUTRUN_CHARCOAL,
    },

    text: {
      primary: OUTRUN_WHITE,
      secondary: OUTRUN_TEXT_SECONDARY,
    },

    divider: "rgba(255, 255, 255, 0.08)",
  },

  typography: {
    fontFamily: [
      "Inter",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),

    h1: {
      fontWeight: 800,
      letterSpacing: "0.02em",
      textTransform: "uppercase",
    },

    h2: {
      fontWeight: 700,
      letterSpacing: "0.02em",
      textTransform: "uppercase",
    },

    h5: {
      fontWeight: 700,
    },

    subtitle1: {
      fontWeight: 500,
    },

    body2: {
      color: OUTRUN_TEXT_PRIMARY,
    },

    button: {
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
  },

  shape: {
    borderRadius: 8,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingTop: 12,
          paddingBottom: 12,
        },
        containedPrimary: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          textTransform: "uppercase",
          fontSize: "0.75rem",
          color: OUTRUN_TEXT_PRIMARY,
        },
      },
    },
  },
});

export { theme };
