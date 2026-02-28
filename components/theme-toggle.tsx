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
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTone = async (frequency: number, durationMs: number, type: OscillatorType, volume: number) => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;

    if (context.state === "suspended") {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const now = context.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000);
  };

  const playThemeSound = (nextTheme: "light" | "dark") => {
    try {
      if (nextTheme === "dark") {
        void playTone(210, 120, "triangle", 0.045);
      } else {
        void playTone(540, 100, "sine", 0.04);
      }
    } catch {
      // Ignore audio failures to keep theme switch non-blocking.
    }
  };

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const nextTheme = stored === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);

    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
    playThemeSound(nextTheme);
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
