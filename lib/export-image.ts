import { SHIFT_NAMES } from "./defaults";
import {
  addDays,
  daysInMonth,
  monthLabel,
  monthStart,
  parseISODate,
  weekLabel,
  weekdayShort,
} from "./dates";
import { groupEmployees, hasEmployeeGroups } from "./team-groups";
import type { ScheduleState, ShiftKey } from "./types";

export type ExportRange = "week" | "fourWeeks" | "month";
export type ExportGroup = "all" | "pizzaiolos" | "others";

export function exportGroupLabel(group: ExportGroup): string {
  if (group === "pizzaiolos") return "Pizzaiolos";
  if (group === "others") return "Colaboradores";
  return "Toda a equipa";
}

type DrawableCanvas = {
  width: number;
  height: number;
  getContext(contextId: "2d"): CanvasRenderingContext2D | null;
};

/** Cores retiradas do horário de atendimento do Mr Pizza. */
export const EXPORT_COLORS = {
  navy: "#1f4e78",
  band: "#2c5a85",
  day: "#c5d9f1",
  weekend: "#8db4e2",
  off: "#92d050",
  ink: "#000000",
  paper: "#ffffff",
} as const;

const PADDING = 36;
const TITLE_HEIGHT = 62;
const TITLE_GAP = 22;
const HEADER_HEIGHT = 38;
const GROUP_HEADER_HEIGHT = 26;
const ROW_HEIGHT = 34;
const DAY_COLUMN = 132;
const MIN_EMPLOYEE_COLUMN = 104;
const MIN_WIDTH = 900;
const LEGEND_HEIGHT = 42;
const SCALE = 2;

const pad = (value: number) => String(value).padStart(2, "0");

const dayNumber = (iso: string) => parseISODate(iso).getUTCDate();

/** Fim de semana operacional do Mr Pizza: sexta e sábado. */
const isWeekendDate = (iso: string) => {
  const day = parseISODate(iso).getUTCDay();
  return day === 5 || day === 6;
};

export function exportDateRange(startDate: string, dayCount: number): string[] {
  return Array.from({ length: dayCount }, (_, index) =>
    addDays(startDate, index),
  );
}

/** Primeiro dia do período. No mês completo, usa o mês da quinta-feira da semana. */
export function exportRangeStart(week: string, range: ExportRange): string {
  return range === "month" ? monthStart(addDays(week, 3)) : week;
}

export function exportRangeDays(week: string, range: ExportRange): number {
  if (range === "week") return 7;
  if (range === "fourWeeks") return 28;
  return daysInMonth(exportRangeStart(week, range));
}

/** Ex.: "19/10 – 25/10/2026". */
export function exportRangeShort(startDate: string, dayCount: number): string {
  const start = parseISODate(startDate);
  const end = parseISODate(addDays(startDate, dayCount - 1));
  const startLabel = `${pad(start.getUTCDate())}/${pad(start.getUTCMonth() + 1)}`;
  const endLabel = `${pad(end.getUTCDate())}/${pad(end.getUTCMonth() + 1)}`;
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${startLabel} – ${endLabel}/${end.getUTCFullYear()}`;
  }
  return `${startLabel}/${start.getUTCFullYear()} – ${endLabel}/${end.getUTCFullYear()}`;
}

export function exportRangeLabel(week: string, range: ExportRange): string {
  if (range === "week") return weekLabel(week);
  const start = exportRangeStart(week, range);
  if (range === "month") return monthLabel(start);
  const formatter = new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(parseISODate(start))} – ${formatter.format(
    parseISODate(addDays(start, exportRangeDays(week, range) - 1)),
  )}`;
}

export function exportFileBase(
  week: string,
  range: ExportRange,
  group: ExportGroup,
): string {
  const start = exportRangeStart(week, range);
  const rangeSuffix =
    range === "fourWeeks" ? "-4-semanas" : range === "month" ? "-mes" : "";
  const groupSuffix =
    group === "pizzaiolos"
      ? "-pizzaiolos"
      : group === "others"
        ? "-colaboradores"
        : "";
  return `mr-pizza-horario-${start}${rangeSuffix}${groupSuffix}`;
}

export function buildShareCaption(
  state: ScheduleState,
  week: string,
  range: ExportRange,
  group: ExportGroup,
): string {
  const { weekday, weekend } = state.settings;
  const title =
    group === "pizzaiolos"
      ? "MR PIZZA · HORÁRIO DOS PIZZAIOLOS"
      : group === "others"
        ? "MR PIZZA · HORÁRIO DOS COLABORADORES"
        : "MR PIZZA · HORÁRIO DE ATENDIMENTO";
  return [
    title,
    exportRangeLabel(week, range),
    "",
    `${SHIFT_NAMES[0]}: ${weekday[0].start}–${weekday[0].end} (seg–qui e dom) · ${weekend[0].start}–${weekend[0].end} (sex e sáb)`,
    `${SHIFT_NAMES[1]}: ${weekday[1].start}–${weekday[1].end} (seg–qui e dom) · ${weekend[1].start}–${weekend[1].end} (sex e sáb)`,
  ].join("\n");
}

function fittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: number | string,
  minSize = 10,
): string {
  let current = size;
  while (current >= minSize) {
    ctx.font = `${weight} ${current}px Arial, Helvetica, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return text;
    current -= 1;
  }
  ctx.font = `${weight} ${minSize}px Arial, Helvetica, sans-serif`;
  let clipped = text;
  while (
    clipped.length > 1 &&
    ctx.measureText(`${clipped}…`).width > maxWidth
  ) {
    clipped = clipped.slice(0, -1);
  }
  return clipped === text ? text : `${clipped}…`;
}

export function drawScheduleImage(
  canvas: DrawableCanvas,
  state: ScheduleState,
  week: string,
  range: ExportRange,
  group: ExportGroup,
): void {
  const startDate = exportRangeStart(week, range);
  const dayCount = exportRangeDays(week, range);
  const allGroups = groupEmployees(state.employees);
  const employeeGroups =
    group === "all"
      ? allGroups
      : allGroups.filter((item) => item.key === group);
  const showGroups = hasEmployeeGroups(employeeGroups);
  const employees = employeeGroups.flatMap((group) => group.employees);
  const employeeCount = Math.max(1, employees.length);
  const dates = exportDateRange(startDate, dayCount);

  const width = Math.max(
    MIN_WIDTH,
    PADDING * 2 + DAY_COLUMN + MIN_EMPLOYEE_COLUMN * employeeCount,
  );
  const tableWidth = width - PADDING * 2;
  const employeeColumn = (tableWidth - DAY_COLUMN) / employeeCount;
  const tableX = PADDING;
  const titleY = PADDING;
  const headerY = titleY + TITLE_HEIGHT + TITLE_GAP;
  const groupHeaderHeight = showGroups ? GROUP_HEADER_HEIGHT : 0;
  const rowsY = headerY + groupHeaderHeight + HEADER_HEIGHT;
  const tableBottom = rowsY + dates.length * ROW_HEIGHT;
  const legendY = tableBottom + 20;
  const height = legendY + LEGEND_HEIGHT + PADDING - 10;

  let groupStart = 0;
  const groupSpans = employeeGroups.map((group) => {
    const span = {
      key: group.key,
      label: group.label,
      start: groupStart,
      count: group.employees.length,
    };
    groupStart += group.employees.length;
    return span;
  });

  canvas.width = Math.round(width * SCALE);
  canvas.height = Math.round(height * SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = EXPORT_COLORS.paper;
  ctx.fillRect(0, 0, width, height);

  const assigned = new Set(
    state.assignments.map(
      (assignment) =>
        `${assignment.date}|${assignment.employeeId}|${assignment.shift}`,
    ),
  );

  // Barra do título
  ctx.fillStyle = EXPORT_COLORS.navy;
  ctx.fillRect(tableX, titleY, tableWidth, TITLE_HEIGHT);

  const title =
    group === "pizzaiolos"
      ? "MR PIZZA - HORÁRIO DOS PIZZAIOLOS"
      : group === "others"
        ? "MR PIZZA - HORÁRIO DOS COLABORADORES"
        : "MR PIZZA - HORÁRIO DE ATENDIMENTO";
  const rangeText = exportRangeShort(startDate, dayCount);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "600 12px Arial, Helvetica, sans-serif";
  const rangeWidth = ctx.measureText(rangeText).width;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText(rangeText, tableX + tableWidth - 16, titleY + TITLE_HEIGHT / 2);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  const titleText = fittedText(
    ctx,
    title,
    tableWidth - 2 * (rangeWidth + 24),
    26,
    700,
    18,
  );
  ctx.fillText(titleText, tableX + tableWidth / 2, titleY + TITLE_HEIGHT / 2);

  // Cabeçalho da tabela
  const headerTotalHeight = groupHeaderHeight + HEADER_HEIGHT;
  ctx.fillStyle = EXPORT_COLORS.navy;
  ctx.fillRect(tableX, headerY, tableWidth, headerTotalHeight);

  if (showGroups) {
    ctx.fillStyle = EXPORT_COLORS.band;
    ctx.fillRect(
      tableX + DAY_COLUMN,
      headerY,
      tableWidth - DAY_COLUMN,
      groupHeaderHeight,
    );

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const group of groupSpans) {
      const groupX = tableX + DAY_COLUMN + group.start * employeeColumn;
      const groupWidth = group.count * employeeColumn;
      const label = fittedText(
        ctx,
        group.label.toUpperCase(),
        groupWidth - 10,
        10,
        700,
        7,
      );
      ctx.fillText(
        label,
        groupX + groupWidth / 2,
        headerY + groupHeaderHeight / 2,
      );
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const headerSize = 16;
  const diasText = fittedText(ctx, "Dias", DAY_COLUMN - 14, headerSize, 700);
  ctx.fillText(
    diasText,
    tableX + DAY_COLUMN / 2,
    headerY + headerTotalHeight / 2,
  );

  employees.forEach((employee, employeeIndex) => {
    const columnX = tableX + DAY_COLUMN + employeeIndex * employeeColumn;
    const name = fittedText(
      ctx,
      employee.name,
      employeeColumn - 12,
      headerSize,
      700,
      9,
    );
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      name,
      columnX + employeeColumn / 2,
      headerY + groupHeaderHeight + HEADER_HEIGHT / 2,
    );
  });

  // Linhas
  dates.forEach((date, rowIndex) => {
    const y = rowsY + rowIndex * ROW_HEIGHT;
    const weekend = isWeekendDate(date);

    ctx.fillStyle = weekend ? EXPORT_COLORS.weekend : EXPORT_COLORS.paper;
    ctx.fillRect(tableX, y, DAY_COLUMN, ROW_HEIGHT);
    ctx.fillStyle = EXPORT_COLORS.ink;
    ctx.font = "700 15px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${weekdayShort(date)} ${dayNumber(date)}`,
      tableX + DAY_COLUMN / 2,
      y + ROW_HEIGHT / 2,
    );

    employees.forEach((employee, employeeIndex) => {
      const hasDay = assigned.has(`${date}|${employee.id}|A`);
      const hasNight = assigned.has(`${date}|${employee.id}|B`);
      const shift: ShiftKey | null = hasDay
        ? "A"
        : hasNight
          ? "B"
          : null;
      const both = hasDay && hasNight;
      const label = both
        ? `${SHIFT_NAMES[0]}+${SHIFT_NAMES[1]}`
        : shift
          ? SHIFT_NAMES[shift === "A" ? 0 : 1]
          : "Folga";
      const fill = shift
        ? weekend
          ? EXPORT_COLORS.weekend
          : EXPORT_COLORS.day
        : EXPORT_COLORS.off;
      const columnX = tableX + DAY_COLUMN + employeeIndex * employeeColumn;

      ctx.fillStyle = fill;
      ctx.fillRect(columnX, y, employeeColumn, ROW_HEIGHT);

      ctx.fillStyle = EXPORT_COLORS.ink;
      const value = fittedText(
        ctx,
        label,
        employeeColumn - 10,
        both ? 13 : 16,
        400,
        9,
      );
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(value, columnX + employeeColumn / 2, y + ROW_HEIGHT / 2);
    });
  });

  // Grelha
  ctx.strokeStyle = EXPORT_COLORS.ink;
  ctx.lineWidth = 1.2;
  const lineTop = headerY;
  const lineBottom = tableBottom;

  ctx.beginPath();
  for (let index = 0; index <= employeeCount; index += 1) {
    const x = tableX + DAY_COLUMN + index * employeeColumn;
    ctx.moveTo(x, lineTop);
    ctx.lineTo(x, lineBottom);
  }
  ctx.moveTo(tableX, lineTop);
  ctx.lineTo(tableX, lineBottom);
  for (let index = 0; index <= dates.length; index += 1) {
    const y = rowsY + index * ROW_HEIGHT;
    ctx.moveTo(tableX, y);
    ctx.lineTo(tableX + tableWidth, y);
  }
  ctx.moveTo(tableX, headerY);
  ctx.lineTo(tableX + tableWidth, headerY);
  ctx.moveTo(tableX, rowsY);
  ctx.lineTo(tableX + tableWidth, rowsY);
  ctx.stroke();

  if (showGroups) {
    // Separa a faixa com o nome dos grupos da linha dos nomes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX + DAY_COLUMN, headerY + groupHeaderHeight);
    ctx.lineTo(tableX + tableWidth, headerY + groupHeaderHeight);
    ctx.stroke();

    // Divisória entre pizzaiolos e os restantes colaboradores.
    for (const group of groupSpans.slice(1)) {
      const x = tableX + DAY_COLUMN + group.start * employeeColumn;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, headerY);
      ctx.lineTo(x, rowsY);
      ctx.stroke();

      ctx.strokeStyle = EXPORT_COLORS.ink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, rowsY);
      ctx.lineTo(x, tableBottom);
      ctx.stroke();
    }
  }

  // Contorno exterior
  ctx.lineWidth = 1.6;
  ctx.strokeRect(tableX, headerY, tableWidth, tableBottom - headerY);

  // Legenda
  const legendItems = [
    { label: "Dia / Noite", color: EXPORT_COLORS.day },
    { label: "Sexta e sábado", color: EXPORT_COLORS.weekend },
    { label: "Folga", color: EXPORT_COLORS.off },
  ];
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "400 12.5px Arial, Helvetica, sans-serif";
  let legendX = tableX;
  for (const item of legendItems) {
    ctx.fillStyle = item.color;
    ctx.fillRect(legendX, legendY + 8, 13, 13);
    ctx.strokeStyle = EXPORT_COLORS.ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY + 8, 13, 13);
    ctx.fillStyle = EXPORT_COLORS.ink;
    ctx.fillText(item.label, legendX + 19, legendY + 15);
    legendX += 19 + ctx.measureText(item.label).width + 20;
  }

  const now = new Date();
  const generated = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "#444444";
  ctx.font = "400 12px Arial, Helvetica, sans-serif";
  ctx.fillText(
    `Gerado em ${generated}`,
    tableX + tableWidth,
    legendY + 15,
  );
}
