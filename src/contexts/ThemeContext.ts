import {
  createContext,
  useCleanup,
  useEffect,
  useState,
  useView,
} from "rask-ui";

export type ThemeMode = "light" | "dark" | "system";
export type Theme = "default" | "ocean" | "forest" | "sunset";
export type FontSize = "small" | "medium" | "large";

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  effectiveMode: "light" | "dark"; // The actual mode being displayed
  fontSize: FontSize;
}

const THEME_STORAGE_KEY = "app-theme";

export const ThemeContext = createContext(() => {
  const state = useState(getStoredTheme());

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (e: MediaQueryListEvent) => {
    state.effectiveMode = e.matches ? "dark" : "light";
  };

  mediaQuery.addEventListener("change", handleChange);

  useCleanup(() => mediaQuery.removeEventListener("change", handleChange));

  useEffect(() => {
    applyTheme(state);
    applyFontSize(state.fontSize);
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({
        mode: state.mode,
        theme: state.theme,
        fontSize: state.fontSize,
      })
    );
  });

  const setMode = (mode: ThemeMode) => {
    state.mode = mode;
    state.effectiveMode = mode === "system" ? getSystemTheme() : mode;
  };

  const setTheme = (theme: Theme) => {
    state.theme = theme;
  };

  return useView(state, { setMode, setTheme });

  function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(state: ThemeState) {
    if (typeof window === "undefined") return;

    const root = document.documentElement;

    // Apply dark/light class
    if (state.effectiveMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply theme data attribute
    root.setAttribute("data-theme", state.theme);
  }

  function getStoredTheme(): ThemeState {
    if (typeof window === "undefined") {
      return {
        mode: "system",
        theme: "default",
        effectiveMode: "dark",
        fontSize: "small",
      };
    }

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const effectiveMode =
          parsed.mode === "system" ? getSystemTheme() : parsed.mode;
        return { ...parsed, effectiveMode };
      }
    } catch (error) {
      console.error("Failed to parse stored theme:", error);
    }

    return {
      mode: "system",
      theme: "default",
      effectiveMode: getSystemTheme(),
      fontSize: "small",
    };
  }

  function applyFontSize(fontSize: FontSize) {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    root.setAttribute("data-font-size", fontSize);
  }
});
