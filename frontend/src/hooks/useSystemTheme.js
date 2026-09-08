import { useEffect } from "react";

// Dark is the default look; only fall back to the light palette when the OS
// explicitly prefers light. Dark preference, no preference, or an
// unsupported media query all resolve to dark.
export default function useSystemTheme() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");

    const apply = (prefersLight) => {
      document.documentElement.classList.toggle("dark", !prefersLight);
    };

    apply(media.matches);
    media.addEventListener("change", (event) => apply(event.matches));
    return () => media.removeEventListener("change", (event) => apply(event.matches));
  }, []);
}
