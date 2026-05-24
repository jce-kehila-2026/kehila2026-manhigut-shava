import { createContext, useContext, useState, useEffect } from "react";

/* ── Color tokens for light / dark ── */
export const LIGHT = {
  bg:           "#f5f7fa",
  card:         "#ffffff",
  cardBorder:   "#f1f5f9",
  cardBorderL:  "#e2e8f0",
  text:         "#1a3c5e",
  sub:          "#64748b",
  muted:        "#94a3b8",
  inputBg:      "#f8fafc",
  inputBorder:  "#e2e8f0",
  divider:      "#f1f5f9",
  tagBg:        "#f1f5f9",
  pageTitleSub: "#94a3b8",
};

export const DARK = {
  bg:           "#0f172a",
  card:         "#1e293b",
  cardBorder:   "#334155",
  cardBorderL:  "#475569",
  text:         "#f1f5f9",
  sub:          "#94a3b8",
  muted:        "#64748b",
  inputBg:      "#0f172a",
  inputBorder:  "#334155",
  divider:      "#334155",
  tagBg:        "#1e293b",
  pageTitleSub: "#64748b",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  const toggleTheme = () =>
    setDark((d) => {
      const next = !d;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });

  /* Apply class to <html> so any global CSS / scrollbar can respond */
  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", dark);
  }, [dark]);

  const T = dark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme, T }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
