"use client";

import { useEffect, useRef, useState } from "react";

function applyTheme(theme: "light" | "dark") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const themeSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const nextTheme = stored === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);

    const audio = new Audio("/assets/theme-click.mp3");
    audio.preload = "auto";
    themeSoundRef.current = audio;

    return () => {
      if (themeSoundRef.current) {
        themeSoundRef.current.pause();
        themeSoundRef.current.src = "";
        themeSoundRef.current = null;
      }
    };
  }, []);

  const playThemeSound = () => {
    const audio = themeSoundRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore playback failures to keep theme switch non-blocking.
    });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
    playThemeSound();
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-ink-300 px-3 py-1 text-sm font-medium text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
