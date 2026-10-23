export type ShiftKey = "A" | "B";

export type ShiftTime = {
  /** Hora de início no formato HH:MM. */
  start: string;
  /** Hora de fim no formato HH:MM. Pode terminar no dia seguinte (ex.: 02:00). */
  end: string;
};

export type Settings = {
  /** Turnos de segunda a quinta e domingo: [dia, noite]. */
  weekday: [ShiftTime, ShiftTime];
  /** Turnos de sexta e sábado: [dia, noite]. */
  weekend: [ShiftTime, ShiftTime];
  /** Pessoas mínimas por turno: [dia, noite]. */
  minStaff: [number, number];
  /** Pizzaiolos mínimos por turno: [dia, noite]. */
  minPizzaiolo: [number, number];
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  /** Horas contratadas por semana. `null` quando não definido. */
  contractHours: number | null;
};

export type Assignment = {
  /** Dia no formato YYYY-MM-DD. */
  date: string;
  employeeId: string;
  shift: ShiftKey;
};

export type ScheduleState = {
  version: 1;
  employees: Employee[];
  assignments: Assignment[];
  settings: Settings;
};

/** `supabase` = guardado no Supabase; `file` = ficheiro local de
 * desenvolvimento; `local` = apenas no navegador (sem base de dados ligada). */
export type StorageMode = "supabase" | "file" | "local";
