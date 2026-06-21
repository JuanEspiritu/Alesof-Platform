"use client";

export type ThemeName = "light" | "dark" | "classic";
export type Density = "comfortable" | "compact";

export interface AppPreferences {
  theme: ThemeName;
  sidebarCollapsed: boolean;
  density: Density;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  nocRefreshSeconds: number;
}

export const defaultPreferences: AppPreferences = {
  theme: "light",
  sidebarCollapsed: false,
  density: "comfortable",
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  nocRefreshSeconds: 7,
};

const STORAGE_KEY = "alesof_preferences";

export const themes: Array<{
  id: ThemeName;
  name: string;
  description: string;
  swatches: string[];
}> = [
  {
    id: "light",
    name: "Light",
    description: "Claro, limpio y cómodo para uso diario.",
    swatches: ["#f4f6f8", "#ffffff", "#172033", "#0f766e"],
  },
  {
    id: "dark",
    name: "Dark",
    description: "Oscuro de alto contraste, estilo sistema.",
    swatches: ["#0b1220", "#111827", "#38bdf8", "#14b8a6"],
  },
  {
    id: "classic",
    name: "Classic",
    description: "Apariencia tradicional con azul corporativo.",
    swatches: ["#eef2f7", "#ffffff", "#1e3a5f", "#c2410c"],
  },
];

function normalizeTheme(theme: unknown): ThemeName {
  if (theme === "dark" || theme === "midnight") return "dark";
  if (theme === "classic" || theme === "mineral" || theme === "contrast") return "classic";
  return "light";
}

export function getPreferences(): AppPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultPreferences;
  try {
    const parsed = { ...defaultPreferences, ...JSON.parse(raw) };
    return {
      ...parsed,
      theme: normalizeTheme(parsed.theme),
      nocRefreshSeconds: [5, 7, 10, 15].includes(Number(parsed.nocRefreshSeconds)) ? Number(parsed.nocRefreshSeconds) : 7,
    };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: AppPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  applyPreferences(preferences);
}

export function applyPreferences(preferences = getPreferences()) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = normalizeTheme(preferences.theme);
  document.documentElement.dataset.density = preferences.density;
}
