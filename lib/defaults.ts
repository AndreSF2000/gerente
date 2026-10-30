import type { ScheduleState, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  weekday: [
    { start: "11:00", end: "18:00" },
    { start: "18:00", end: "00:00" },
  ],
  weekend: [
    { start: "11:00", end: "19:00" },
    { start: "19:00", end: "02:00" },
  ],
  middle: [
    { start: "14:00", end: "22:00" },
    { start: "15:00", end: "23:00" },
  ],
  minStaff: [2, 2],
  minPizzaiolo: [1, 1],
};

export const SHIFT_NAMES = ["Dia", "Noite"] as const;
export const MIDDLE_NAME = "Intermédio";

/** Regras da casa: folgas por mês e domingos de folga por mês. */
export const MAX_MONTH_DAYS_OFF = 7;
export const MAX_MONTH_SUNDAYS_OFF = 1;

export const ROLE_SUGGESTIONS = [
  "Gerência",
  "Cozinha",
  "Pizzaiolo",
  "Sala",
  "Balcão",
  "Entregas",
];

export function defaultState(): ScheduleState {
  return {
    version: 1,
    employees: [],
    assignments: [],
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}
