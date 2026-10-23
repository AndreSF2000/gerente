import { SHIFT_NAMES } from "./defaults";
import {
  dayMonthLong,
  isWeekendDay,
  parseISODate,
  weekDays,
  weekdayLong,
} from "./dates";
import { isPizzaiolo } from "./team-groups";
import type {
  Assignment,
  ScheduleState,
  Settings,
  ShiftKey,
  ShiftTime,
} from "./types";

export const SHIFT_KEYS: ShiftKey[] = ["A", "B"];

export function shiftTimeFor(
  settings: Settings,
  dateISO: string,
  shift: ShiftKey,
): ShiftTime {
  const pair = isWeekendDay(dateISO) ? settings.weekend : settings.weekday;
  return pair[shift === "A" ? 0 : 1];
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function shiftMinutes(time: ShiftTime): number {
  const start = timeToMinutes(time.start);
  let end = timeToMinutes(time.end);
  if (end <= start) end += 24 * 60;
  return end - start;
}

/** Ex.: 420 → "7h"; 450 → "7h30". */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

export function shiftTimeLabel(time: ShiftTime): string {
  return `${time.start}–${time.end}`;
}

export function assignmentKey(
  date: string,
  employeeId: string,
  shift: ShiftKey,
): string {
  return `${date}|${employeeId}|${shift}`;
}

export function employeeWeekMinutes(
  state: ScheduleState,
  employeeId: string,
  weekStartISO: string,
): number {
  const days = new Set(weekDays(weekStartISO));
  let total = 0;
  for (const assignment of state.assignments) {
    if (assignment.employeeId !== employeeId || !days.has(assignment.date)) {
      continue;
    }
    total += shiftMinutes(
      shiftTimeFor(state.settings, assignment.date, assignment.shift),
    );
  }
  return total;
}

export function weekTotals(state: ScheduleState, weekStartISO: string) {
  const days = new Set(weekDays(weekStartISO));
  let minutes = 0;
  const employeeIds = new Set<string>();
  let assignments = 0;

  for (const assignment of state.assignments) {
    if (!days.has(assignment.date)) continue;
    assignments += 1;
    employeeIds.add(assignment.employeeId);
    minutes += shiftMinutes(
      shiftTimeFor(state.settings, assignment.date, assignment.shift),
    );
  }

  return { minutes, people: employeeIds.size, assignments };
}

export type WeekWarning = {
  id: string;
  kind: "coverage" | "contract" | "double";
  message: string;
};

export function buildWeekWarnings(
  state: ScheduleState,
  weekStartISO: string,
): WeekWarning[] {
  if (state.employees.length === 0) return [];

  const warnings: WeekWarning[] = [];
  const days = weekDays(weekStartISO);
  const daySet = new Set(days);
  const assignmentsByDate = new Map<string, Assignment[]>();
  const employeeById = new Map(
    state.employees.map((employee) => [employee.id, employee]),
  );

  for (const assignment of state.assignments) {
    if (!daySet.has(assignment.date)) continue;
    const list = assignmentsByDate.get(assignment.date) ?? [];
    list.push(assignment);
    assignmentsByDate.set(assignment.date, list);
  }

  for (const date of days) {
    const dayAssignments = assignmentsByDate.get(date) ?? [];
    for (const shift of SHIFT_KEYS) {
      const index = shift === "A" ? 0 : 1;
      const minimum = state.settings.minStaff[index];
      const count = dayAssignments.filter((item) => item.shift === shift).length;
      if (minimum > 0 && count < minimum) {
        warnings.push({
          id: `coverage-${date}-${shift}`,
          kind: "coverage",
          message: `${weekdayLong(date)}, ${dayMonthLong(date)} · ${SHIFT_NAMES[index]}: ${
            count === 1 ? "1 pessoa" : `${count} pessoas`
          } (mínimo ${minimum}).`,
        });
      }

      const pizzaioloMinimum = state.settings.minPizzaiolo[index];
      if (!pizzaioloMinimum) continue;
      const pizzaioloCount = dayAssignments.filter((item) => {
        if (item.shift !== shift) return false;
        const employee = employeeById.get(item.employeeId);
        return employee ? isPizzaiolo(employee) : false;
      }).length;
      if (pizzaioloCount < pizzaioloMinimum) {
        warnings.push({
          id: `pizzaiolo-${date}-${shift}`,
          kind: "coverage",
          message: `${weekdayLong(date)}, ${dayMonthLong(date)} · Pizzaiolos (${SHIFT_NAMES[index]}): ${
            pizzaioloCount === 1 ? "1 pizzaiolo" : `${pizzaioloCount} pizzaiolos`
          } (mínimo ${pizzaioloMinimum}).`,
        });
      }
    }
  }

  for (const employee of state.employees) {
    const minutes = employeeWeekMinutes(state, employee.id, weekStartISO);
    if (
      employee.contractHours !== null &&
      minutes > Math.round(employee.contractHours * 60)
    ) {
      warnings.push({
        id: `contract-${employee.id}`,
        kind: "contract",
        message: `${employee.name} tem ${formatDuration(minutes)} atribuídas (contrato: ${employee.contractHours}h).`,
      });
    }

    for (const date of days) {
      const hasBoth = SHIFT_KEYS.every((shift) =>
        (assignmentsByDate.get(date) ?? []).some(
          (item) => item.employeeId === employee.id && item.shift === shift,
        ),
      );
      if (hasBoth) {
        warnings.push({
          id: `double-${employee.id}-${date}`,
          kind: "double",
          message: `${employee.name} tem os dois turnos no mesmo dia (${weekdayLong(
            date,
          ).toLowerCase()}, ${dayMonthLong(date)}).`,
        });
      }
    }
  }

  return warnings;
}

/** Data mínima/máxima dos turnos guardados, para não perder histórico ao navegar. */
export function sortedAssignmentDates(state: ScheduleState): string[] {
  return Array.from(new Set(state.assignments.map((item) => item.date))).sort();
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISODate(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
