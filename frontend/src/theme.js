import { createTheme, alpha } from "@mui/material/styles";

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

// Shared timing for every interactive transition added below (buttons,
// inputs, toggles) so hover/press/focus feedback feels like one consistent
// system rather than a pile of mismatched, per-component tweaks.
const TRANSITION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const TRANSITION_DURATION = 200;

// Soft, palette-aware elevation shadow for MuiPaper/MuiCard "elevation"
// surfaces. Dark mode wants a deeper/darker shadow to read against a dark
// background; light mode needs a much more diffuse, low-opacity one or it
// looks like a heavy-handed drop shadow. Scales gently with `elevation` so
// higher layers (menus, dialogs) read as "further forward" than a card.
function buildElevationShadow(theme, elevation = 1) {
  const isDark = theme.palette.mode === "dark";
  const depth = 1 + Math.min(Math.max(elevation, 1), 8) * 0.35;
  return isDark
    ? `0 ${Math.round(2 * depth)}px ${Math.round(10 * depth)}px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)`
    : `0 ${Math.round(1.5 * depth)}px ${Math.round(8 * depth)}px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.05)`;
}

// Resolves a Button's effective palette color object from its `color` prop.
// Buttons using color="inherit" or "default" (e.g. dialog Cancel actions,
// the Sort button) are deliberately neutral/de-emphasized — falling back to
// `primary` would give them the same gold hover glow as a primary action
// and defeat that intent, so they fall back to a neutral text-based tone
// instead. Only genuinely unrecognized values fall back to primary.
function resolveButtonColor(theme, ownerState) {
  const candidate = ownerState.color;
  if (candidate === "inherit" || candidate === "default") {
    return { main: theme.palette.text.primary };
  }
  return theme.palette[candidate] ? theme.palette[candidate] : theme.palette.primary;
}

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
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: "none",
            fontWeight: 600,
            transition: theme.transitions.create(
              ["transform", "box-shadow", "background-color", "border-color", "color"],
              { duration: TRANSITION_DURATION, easing: TRANSITION_EASING }
            ),
            // Reduced-motion users still get instant color/background feedback;
            // they just don't get the lift/scale motion or shadow animation.
            "@media (prefers-reduced-motion: reduce)": {
              transition: theme.transitions.create(
                ["background-color", "border-color", "color"],
                { duration: TRANSITION_DURATION, easing: TRANSITION_EASING }
              ),
            },
          }),
          contained: ({ theme, ownerState }) => {
            const paletteColor = resolveButtonColor(theme, ownerState);
            const isDark = theme.palette.mode === "dark";
            const restingAlpha = isDark ? 0.35 : 0.16;
            const hoverAlpha = isDark ? 0.5 : 0.26;
            return {
              boxShadow: `0 2px 8px ${alpha(paletteColor.main, restingAlpha)}`,
              "@media (prefers-reduced-motion: no-preference)": {
                "&:hover:not(.Mui-disabled)": {
                  transform: "translateY(-1px)",
                  boxShadow: `0 4px 16px ${alpha(paletteColor.main, hoverAlpha)}`,
                },
                "&:active:not(.Mui-disabled)": {
                  transform: "translateY(0) scale(0.98)",
                },
              },
              // Explicit guard: disabled buttons never get a shadow or motion,
              // regardless of what the hover/active rules above say.
              "&.Mui-disabled": {
                boxShadow: "none",
                transform: "none",
              },
              // MUI's own base Button styles set an unconditional hover
              // box-shadow (its default grey elevation bump). Without this,
              // reduced-motion users would still see THAT shadow change on
              // hover even though our animated version above is gated off —
              // so pin it back to the static resting shadow explicitly.
              "@media (prefers-reduced-motion: reduce)": {
                "&:hover:not(.Mui-disabled)": {
                  boxShadow: `0 2px 8px ${alpha(paletteColor.main, restingAlpha)}`,
                },
                "&:active:not(.Mui-disabled)": {
                  boxShadow: `0 2px 8px ${alpha(paletteColor.main, restingAlpha)}`,
                },
              },
            };
          },
          outlined: ({ theme, ownerState }) => {
            const paletteColor = resolveButtonColor(theme, ownerState);
            return {
              // Outlined buttons stay flatter/quieter by design (no
              // transform/shadow) — that's the contained-button's language.
              "&:hover:not(.Mui-disabled)": {
                backgroundColor: alpha(paletteColor.main, 0.08),
                borderColor: paletteColor.main,
              },
            };
          },
          text: ({ theme, ownerState }) => {
            const paletteColor = resolveButtonColor(theme, ownerState);
            return {
              "&:hover:not(.Mui-disabled)": {
                backgroundColor: alpha(paletteColor.main, 0.08),
              },
            };
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          // Outlined surfaces keep their existing flat, bordered look
          // (handled by MUI's own default outlined styles) — only
          // "elevation" surfaces (the default) get the new soft shadow.
          root: ({ theme, ownerState }) => {
            if (ownerState.variant === "outlined") return {};
            return {
              boxShadow: buildElevationShadow(theme, ownerState.elevation),
            };
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme, ownerState }) => {
            if (ownerState.variant === "outlined") return {};
            return {
              boxShadow: buildElevationShadow(theme, ownerState.elevation),
            };
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            "& .MuiOutlinedInput-notchedOutline": {
              transition: theme.transitions.create(["border-color"], {
                duration: TRANSITION_DURATION,
                easing: TRANSITION_EASING,
              }),
            },
            "&:hover:not(.Mui-disabled):not(.Mui-focused) .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(
                theme.palette.primary.main,
                theme.palette.mode === "dark" ? 0.6 : 0.5
              ),
            },
            // MUI already brightens the focus ring to primary.main; keep it
            // explicit here so the transition timing matches the rest of the
            // system instead of relying on the (unanimated) default.
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
            },
          }),
        },
      },
      MuiSelect: {
        styleOverrides: {
          outlined: ({ theme }) => ({
            transition: theme.transitions.create(["border-color", "background-color"], {
              duration: TRANSITION_DURATION,
              easing: TRANSITION_EASING,
            }),
          }),
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: "none",
            transition: theme.transitions.create(["background-color", "color", "border-color"], {
              duration: TRANSITION_DURATION,
              easing: TRANSITION_EASING,
            }),
          }),
        },
      },
    },
  });
}

export default createAppTheme;
