import React, { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("flotilla_theme") as Theme | null;
    if (saved && ["dark", "light", "system"].includes(saved)) {
      return saved;
    }
    return "dark"; // Default to dark hardware theme
  });

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      let resolved: "dark" | "light" = "dark";
      if (theme === "system") {
        resolved = mediaQuery.matches ? "dark" : "light";
      } else {
        resolved = theme;
      }

      setResolvedTheme(resolved);

      if (resolved === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
    };

    applyTheme();
    localStorage.setItem("flotilla_theme", theme);

    const listener = () => {
      if (theme === "system") applyTheme();
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => {
    setThemeState((prev) => (resolvedTheme === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
        "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm",
        "dark:border-[#222838] dark:bg-[#121622] dark:text-zinc-300 dark:hover:border-[#2e374d] dark:hover:bg-[#181d2a] dark:hover:text-white dark:shadow-none",
        className
      )}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}
