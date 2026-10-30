import { DEFAULT_SETTINGS } from "./defaults";
import type {
  Assignment,
  Employee,
  ScheduleState,
  Settings,
  ShiftKey,
  ShiftTime,
} from "./types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EMPLOYEES = 200;
const MAX_ASSIGNMENTS = 20_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readTime(value: unknown): ShiftTime | null {
  const record = asRecord(value);
  if (!record) return null;
  const start = typeof record.start === "string" ? record.start.slice(0, 5) : "";
  const end = typeof record.end === "string" ? record.end.slice(0, 5) : "";
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return null;
  return { start, end };
}

function readShiftPair(value: unknown): [ShiftTime, ShiftTime] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const first = readTime(value[0]);
  const second = readTime(value[1]);
  if (!first || !second) return null;
  return [first, second];
}

function readMinimumPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const pair = value.map((item) => Number(item));
  if (!pair.every((item) => Number.isInteger(item) && item >= 0 && item <= 50)) {
    return null;
  }
  return [pair[0], pair[1]];
}

function readSettings(value: unknown): Settings | null {
  const record = asRecord(value);
  if (!record) return null;
  const weekday = readShiftPair(record.weekday);
  const weekend = readShiftPair(record.weekend);
  if (!weekday || !weekend) return null;
  // Dados antigos não têm o turno intermédio: fica o horário por defeito.
  const middle =
    readShiftPair(record.middle) ?? structuredClone(DEFAULT_SETTINGS.middle);

  const minStaff = readMinimumPair(record.minStaff);
  if (!minStaff) return null;
  // Dados antigos não têm este campo: nesse caso fica o mínimo habitual.
  const minPizzaiolo = readMinimumPair(record.minPizzaiolo) ?? [1, 1];

  return {
    weekday,
    weekend,
    middle,
    minStaff,
    minPizzaiolo,
  };
}

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readEmployee(value: unknown): Employee | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const role = typeof record.role === "string" ? record.role.trim() : "";
  if (!id || id.length > 64) return null;

  let contractHours: number | null = null;
  if (typeof record.contractHours === "number" && Number.isFinite(record.contractHours)) {
    contractHours = Math.min(168, Math.max(0, Math.round(record.contractHours * 4) / 4));
  }

  return {
    id,
    name: (name || "Sem nome").slice(0, 60),
    role: role.slice(0, 40),
    contractHours,
  };
}

/**
 * Valida e normaliza o estado vindo do cliente, do ficheiro local ou da base de dados.
 * Devolve `null` quando a estrutura é inválida.
 */
export function sanitizeState(input: unknown): ScheduleState | null {
  const record = asRecord(input);
  if (!record) return null;
  if (!Array.isArray(record.employees) || !Array.isArray(record.assignments)) {
    return null;
  }

  const settings = readSettings(record.settings);
  if (!settings) return null;

  const employees: Employee[] = [];
  const employeeIds = new Set<string>();
  for (const item of record.employees.slice(0, MAX_EMPLOYEES)) {
    const employee = readEmployee(item);
    if (!employee || employeeIds.has(employee.id)) continue;
    employeeIds.add(employee.id);
    employees.push(employee);
  }

  const assignments: Assignment[] = [];
  const seen = new Set<string>();
  for (const item of record.assignments.slice(0, MAX_ASSIGNMENTS)) {
    const entry = asRecord(item);
    if (!entry) continue;
    const date = typeof entry.date === "string" ? entry.date : "";
    const employeeId = typeof entry.employeeId === "string" ? entry.employeeId : "";
    const shift = entry.shift as ShiftKey;
    if (!isRealDate(date) || !employeeIds.has(employeeId)) continue;
    if (shift !== "A" && shift !== "B" && shift !== "C") continue;
    const key = `${date}|${employeeId}|${shift}`;
    if (seen.has(key)) continue;
    seen.add(key);
    assignments.push({ date, employeeId, shift });
  }

  return { version: 1, employees, assignments, settings };
}
