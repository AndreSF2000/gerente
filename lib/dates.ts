const DAY_MS = 86_400_000;

const pad = (value: number) => String(value).padStart(2, "0");

/** Data de hoje (fuso local) no formato YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Converte YYYY-MM-DD num Date UTC ao meio-dia (evita problemas de horário de verão). */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function toISODate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(iso: string, days: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + days * DAY_MS));
}

/** Segunda-feira da semana que contém a data. */
export function weekStart(iso: string): string {
  const dayOfWeek = (parseISODate(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -dayOfWeek);
}

export function weekDays(startISO: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(startISO, index));
}

/** Sexta-feira ou sábado usam o horário de fim de semana. */
export function isWeekendDay(iso: string): boolean {
  const day = parseISODate(iso).getUTCDay();
  return day === 5 || day === 6;
}

const capitalize = (value: string) =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

export function weekdayShort(iso: string): string {
  const formatted = new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    timeZone: "UTC",
  }).format(parseISODate(iso));
  return capitalize(
    formatted.replace(/-feira$/, "").replace(/\.$/, "").slice(0, 3),
  );
}

export function weekdayLong(iso: string): string {
  const formatted = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    timeZone: "UTC",
  }).format(parseISODate(iso));
  return capitalize(formatted);
}

export function dayMonth(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(parseISODate(iso));
}

export function dayMonthLong(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parseISODate(iso));
}

/** Ex.: "19 – 25 de outubro de 2026" (ou com os dois meses quando mudam). */
export function weekLabel(startISO: string): string {
  const start = parseISODate(startISO);
  const end = parseISODate(addDays(startISO, 6));
  const monthFormat = new Intl.DateTimeFormat("pt-PT", {
    month: "long",
    timeZone: "UTC",
  });
  const startMonth = monthFormat.format(start);
  const endMonth = monthFormat.format(end);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear !== endYear) {
    return `${start.getUTCDate()} de ${startMonth} de ${startYear} – ${end.getUTCDate()} de ${endMonth} de ${endYear}`;
  }
  if (startMonth === endMonth) {
    return `${start.getUTCDate()} – ${end.getUTCDate()} de ${endMonth} de ${endYear}`;
  }
  return `${start.getUTCDate()} de ${startMonth} – ${end.getUTCDate()} de ${endMonth} de ${endYear}`;
}

export function isoWeekNumber(iso: string): number {
  const date = parseISODate(iso);
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);

  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}
