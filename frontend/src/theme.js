import { createTheme } from "@mui/material/styles";

// Keep these two palettes as separate, explicit objects (not derived from one
// another) so either can be independently tuned without affecting the other.

const darkPalette = {
  mode: "dark",
  background: {
    default: "#0F0F23",
    paper: "#1B1B30",
  },
  primary: {
    main: "#CA8A04",
    contrastText: "#0F0F23",
  },
  secondary: {
    main: "#4338CA",
    contrastText: "#FFFFFF",
  },
  text: {
    primary: "#F8FAFC",
    secondary: "#94A3B8",
  },
  divider: "rgba(255,255,255,0.08)",
  error: {
    main: "#EF4444",
  },
};

const lightPalette = {
  mode: "light",
  background: {
    default: "#F8FAFC",
    paper: "#FFFFFF",
  },
  primary: {
    main: "#92650A",
    contrastText: "#FFFFFF",
  },
  secondary: {
    main: "#4338CA",
    contrastText: "#FFFFFF",
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
  },
  divider: "rgba(15,23,42,0.08)",
  error: {
    main: "#DC2626",
  },
};

const fontFamily = '"Inter", "Roboto", "Helvetica", "Arial", sans-serif';

/**
 * Builds the MUI theme for the given mode.
 *
 * @param {"light"|"dark"} mode
 * @returns {import("@mui/material/styles").Theme}
 */
export function createAppTheme(mode) {
  const palette = mode === "light" ? lightPalette : darkPalette;

  return createTheme({
    palette,
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily,
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      body1: { fontWeight: 400 },
      body2: { fontWeight: 400 },
      overline: {
        fontWeight: 500,
        letterSpacing: "0.08em",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: "background-color 200ms ease, color 200ms ease",
            "@media (prefers-reduced-motion: reduce)": {
              transition: "none",
            },
          },
        },
      },
    },
  });
}

export default createAppTheme;
