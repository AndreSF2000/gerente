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
  minStaff: [2, 2],
};

export const SHIFT_NAMES = ["Dia", "Noite"] as const;

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
