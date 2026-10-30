"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MAX_MONTH_DAYS_OFF,
  MAX_MONTH_SUNDAYS_OFF,
  MIDDLE_NAME,
  SHIFT_NAMES,
} from "@/lib/defaults";
import {
  addDays,
  addMonths,
  dayMonth,
  dayMonthLong,
  dayNumber,
  daysInMonth,
  isWeekendDay,
  isoWeekNumber,
  monthCalendar,
  monthLabel,
  monthStart,
  parseISODate,
  todayISO,
  weekDays,
  weekLabel,
  weekStart,
  weekdayShort,
} from "@/lib/dates";
import {
  assignmentKey,
  buildWeekWarnings,
  employeeMinutes,
  formatDuration,
  rangeTotals,
  shiftTimeFor,
  shiftTimeLabel,
} from "@/lib/schedule";
import {
  type EmployeeGroup,
  groupEmployees,
  hasEmployeeGroups,
  isPizzaiolo,
} from "@/lib/team-groups";
import type { ScheduleState, ShiftKey } from "@/lib/types";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  TeamIcon,
  WarningIcon,
} from "./icons";

/** Opções de cada célula, pela ordem do dia; o valor são os turnos (A, B, C). */
const CELL_OPTIONS = [
  ["", "Folga"],
  ["A", SHIFT_NAMES[0]],
  ["C", MIDDLE_NAME],
  ["B", SHIFT_NAMES[1]],
  ["AB", `${SHIFT_NAMES[0]}+${SHIFT_NAMES[1]}`],
] as const;

const CELL_SHIFTS: ShiftKey[] = ["A", "B", "C"];

type Props = {
  state: ScheduleState;
  week: string;
  initialDay?: string;
  onWeekChange: (week: string) => void;
  onToggle: (date: string, employeeId: string, shift: ShiftKey) => void;
  onCopyPrevious: () => void;
  onGoTeam: () => void;
};

export default function ScheduleView({
  state,
  week,
  initialDay,
  onWeekChange,
  onToggle,
  onCopyPrevious,
  onGoTeam,
}: Props) {
  const days = useMemo(() => weekDays(week), [week]);
  const today = todayISO();
  const currentWeek = useMemo(() => days.includes(today), [days, today]);
  const [view, setView] = useState<"month" | "week">("month");
  const [month, setMonth] = useState(() =>
    monthStart(initialDay ?? (currentWeek ? today : addDays(week, 3))),
  );
  const monthView = view === "month";
  const rows = useMemo(
    () =>
      monthView
        ? Array.from({ length: daysInMonth(month) }, (_, index) =>
            addDays(month, index),
          )
        : days,
    [monthView, month, days],
  );
  const currentPeriod = monthView ? month === monthStart(today) : currentWeek;
  const periodLabel = monthView ? monthLabel(month) : weekLabel(week);
  const totals = useMemo(() => rangeTotals(state, rows), [state, rows]);
  const daysOff = useMemo(() => {
    const working = new Set(
      state.assignments.map((item) => `${item.date}|${item.employeeId}`),
    );
    return new Map(
      state.employees.map((employee) => {
        const off = rows.filter(
          (date) => !working.has(`${date}|${employee.id}`),
        );
        const sundays = off.filter(
          (date) => parseISODate(date).getUTCDay() === 0,
        ).length;
        return [employee.id, { days: off.length, sundays }];
      }),
    );
  }, [state.assignments, state.employees, rows]);

  const warnings = useMemo(() => {
    if (!monthView) return buildWeekWarnings(state, week);
    const inMonth = new Set(rows);
    const result = [];
    // Semanas que tocam o mês; os avisos de dias fora do mês ficam de fora.
    for (
      let start = weekStart(month);
      start < month || inMonth.has(start);
      start = addDays(start, 7)
    ) {
      for (const warning of buildWeekWarnings(state, start)) {
        if (warning.date && !inMonth.has(warning.date)) continue;
        result.push(
          warning.date
            ? warning
            : {
                ...warning,
                id: `${warning.id}-${start}`,
                message: `Semana ${isoWeekNumber(start)}: ${warning.message}`,
              },
        );
      }
    }
    const monthName = monthLabel(month).toLowerCase();
    for (const employee of state.employees) {
      const off = daysOff.get(employee.id);
      if (off && off.days > MAX_MONTH_DAYS_OFF) {
        result.push({
          id: `off-${employee.id}`,
          kind: "contract" as const,
          message: `${employee.name} tem ${off.days} folgas em ${monthName} (máximo ${MAX_MONTH_DAYS_OFF}).`,
        });
      }
      if (off && off.sundays > MAX_MONTH_SUNDAYS_OFF) {
        result.push({
          id: `off-sunday-${employee.id}`,
          kind: "contract" as const,
          message: `${employee.name} tem ${off.sundays} domingos de folga em ${monthName} (máximo ${MAX_MONTH_SUNDAYS_OFF}).`,
        });
      }
    }
    return result;
  }, [monthView, state, week, month, rows, daysOff]);
  const employeeGroups = useMemo(
    () => groupEmployees(state.employees),
    [state.employees],
  );
  const canFilter = hasEmployeeGroups(employeeGroups);
  const [groupFilter, setGroupFilter] = useState<
    "all" | EmployeeGroup["key"]
  >("all");
  const filtered = employeeGroups.filter((group) => group.key === groupFilter);
  const visibleGroups = filtered.length > 0 ? filtered : employeeGroups;
  const showGroups = hasEmployeeGroups(visibleGroups);
  const employees = visibleGroups.flatMap((group) => group.employees);

  const [selectedDay, setSelectedDay] = useState(
    () => initialDay ?? todayISO(),
  );
  const [monthOpen, setMonthOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => monthStart(todayISO()));
  const monthCells = useMemo(() => monthCalendar(monthCursor), [monthCursor]);

  useEffect(() => {
    if (!days.includes(selectedDay)) setSelectedDay(week);
  }, [days, selectedDay, week]);

  const assigned = useMemo(
    () =>
      new Set(
        state.assignments.map((item) =>
          assignmentKey(item.date, item.employeeId, item.shift),
        ),
      ),
    [state.assignments],
  );

  const coverage = useMemo(() => {
    const map = new Map<string, { A: number; B: number }>();
    for (const item of state.assignments) {
      if (item.shift === "C") continue;
      const entry = map.get(item.date) ?? { A: 0, B: 0 };
      entry[item.shift] += 1;
      map.set(item.date, entry);
    }
    return map;
  }, [state.assignments]);

  const teamCoverage = useMemo(() => {
    const map = new Map<string, { A: number; B: number }>();
    const byId = new Map(
      state.employees.map((employee) => [employee.id, employee]),
    );
    for (const item of state.assignments) {
      const employee = byId.get(item.employeeId);
      if (employee && isPizzaiolo(employee)) continue;
      if (item.shift === "C") continue;
      const entry = map.get(item.date) ?? { A: 0, B: 0 };
      entry[item.shift] += 1;
      map.set(item.date, entry);
    }
    return map;
  }, [state.assignments, state.employees]);

  const pizzaioloCoverage = useMemo(() => {
    const map = new Map<string, { A: number; B: number }>();
    const byId = new Map(state.employees.map((employee) => [employee.id, employee]));
    for (const item of state.assignments) {
      const employee = byId.get(item.employeeId);
      if (!employee || !isPizzaiolo(employee)) continue;
      if (item.shift === "C") continue;
      const entry = map.get(item.date) ?? { A: 0, B: 0 };
      entry[item.shift] += 1;
      map.set(item.date, entry);
    }
    return map;
  }, [state.assignments, state.employees]);

  const previousWeek = useMemo(() => weekDays(addDays(week, -7)), [week]);
  const previousCount = useMemo(
    () =>
      state.assignments.filter((item) => previousWeek.includes(item.date))
        .length,
    [state.assignments, previousWeek],
  );

  const todayLabel = new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
  }).format(new Date());

  const employeeCount = state.employees.length;
  const coverageColumns = [
    {
      key: "others",
      label: "Equipa",
      title: "Equipa sem pizzaiolos (A = dia, B = noite)",
      coverage: teamCoverage,
      minimum: state.settings.minStaff,
    },
    {
      key: "pizzaiolos",
      label: "Pizzaiolos",
      title: "Pizzaiolos (A = dia, B = noite)",
      coverage: pizzaioloCoverage,
      minimum: state.settings.minPizzaiolo,
    },
  ].filter((column) => filtered.length === 0 || column.key === groupFilter);
  const shownMinutes = employees.reduce(
    (sum, employee) => sum + employeeMinutes(state, employee.id, rows),
    0,
  );
  const countsFor = (date: string) => coverage.get(date) ?? { A: 0, B: 0 };

  const goWeek = (delta: number) => {
    const nextDay = addDays(selectedDay, delta * 7);
    onWeekChange(addDays(week, delta * 7));
    setSelectedDay(nextDay);
    setMonthCursor(monthStart(nextDay));
  };

  const showMonth = (next: string) => {
    setMonth(next);
    // A semana com o dia 4 tem a quinta-feira neste mês, como a exportação.
    onWeekChange(weekStart(addDays(next, 3)));
  };

  const changeView = (next: "month" | "week") => {
    if (next === "month") setMonth(monthStart(addDays(week, 3)));
    setView(next);
  };

  const goToday = () => {
    const now = todayISO();
    if (monthView) return showMonth(monthStart(now));
    onWeekChange(weekStart(now));
    setSelectedDay(now);
    setMonthCursor(monthStart(now));
  };

  const selectDay = (date: string, closeMonth = false) => {
    setSelectedDay(date);
    if (!days.includes(date)) onWeekChange(weekStart(date));
    setMonthCursor(monthStart(date));
    if (closeMonth) setMonthOpen(false);
  };

  const toggleMonth = () => {
    if (!monthOpen) setMonthCursor(monthStart(selectedDay));
    setMonthOpen((open) => !open);
  };

  return (
    <div className="schedule-view">
      <section className="week-card card no-print">
        <div className="week-main">
          <div className="week-nav">
            <button
              type="button"
              className="btn icon"
              aria-label={monthView ? "Mês anterior" : "Semana anterior"}
              onClick={() =>
                monthView ? showMonth(addMonths(month, -1)) : goWeek(-1)
              }
            >
              <ArrowLeftIcon className="btn-icon" />
            </button>
            <div className="week-title">
              <span className="week-kicker">
                {monthView
                  ? `Mês completo${currentPeriod ? " · este mês" : ""}`
                  : `Semana ${isoWeekNumber(week)}${
                      currentPeriod ? " · esta semana" : ""
                    }`}
              </span>
              <h2 className="week-range">{periodLabel}</h2>
            </div>
            <button
              type="button"
              className="btn icon"
              aria-label={monthView ? "Mês seguinte" : "Semana seguinte"}
              onClick={() =>
                monthView ? showMonth(addMonths(month, 1)) : goWeek(1)
              }
            >
              <ArrowRightIcon className="btn-icon" />
            </button>
          </div>

          <div className="week-actions">
            <div className="range-tabs" role="group" aria-label="Período">
              {(["month", "week"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className="range-tab"
                  aria-pressed={view === option}
                  onClick={() => changeView(option)}
                >
                  {option === "month" ? "Mês" : "Semana"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn ghost"
              disabled={currentPeriod}
              onClick={goToday}
            >
              Hoje
            </button>
            {!monthView && (
              <button
                type="button"
                className="btn"
                onClick={onCopyPrevious}
                disabled={previousCount === 0}
                title={
                  previousCount === 0
                    ? "A semana anterior não tem turnos"
                    : "Copiar os turnos da semana anterior para esta semana"
                }
              >
                <CopyIcon className="btn-icon" />
                Copiar semana anterior
              </button>
            )}
          </div>
        </div>

        <div className="week-stats">
          <span className="stat">
            <TeamIcon className="stat-icon" />
            <strong>{employeeCount}</strong>{" "}
            {employeeCount === 1 ? "colaborador" : "colaboradores"}
          </span>
          <span className="stat">
            <strong>{totals.people}</strong> com turnos
          </span>
          <span className="stat">
            <strong>{formatDuration(totals.minutes)}</strong> atribuídas
          </span>
          <span className={warnings.length > 0 ? "stat warn" : "stat"}>
            <WarningIcon className="stat-icon" />
            <strong>{warnings.length}</strong>{" "}
            {warnings.length === 1 ? "aviso" : "avisos"}
          </span>
        </div>
      </section>

      <div className="print-only print-head">
        <div>
          <span className="print-brand">Mr Pizza</span>
          <span className="print-sub">Horário da equipa</span>
        </div>
        <div className="print-week">
          <strong>{periodLabel}</strong>
          {!monthView && <span>Semana {isoWeekNumber(week)}</span>}
        </div>
        <div className="print-note">Impresso a {todayLabel}</div>
      </div>

      {employeeCount === 0 ? (
        <section className="card empty no-print">
          <span className="empty-mark">
            <TeamIcon className="empty-icon" />
          </span>
          <h2>Ainda não tens equipa</h2>
          <p>
            Adiciona os colaboradores do Mr Pizza e depois clica nos turnos para
            montar a semana.
          </p>
          <button type="button" className="btn primary" onClick={onGoTeam}>
            Adicionar colaboradores
          </button>
        </section>
      ) : (
        <section className="grid-card card">
          <div className="grid-head no-print">
            {canFilter && (
              <div className="range-tabs" role="group" aria-label="Mostrar">
                {(
                  [
                    ["all", "Todos"],
                    ["pizzaiolos", "Pizzaiolos"],
                    ["others", "Colaboradores"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="range-tab"
                    aria-pressed={groupFilter === key}
                    onClick={() => setGroupFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <span className="grid-hint">
              Toca numa célula para escolher o turno.
            </span>
            <span className="grid-hint subtle">
              {totals.assignments} {totals.assignments === 1 ? "turno" : "turnos"}{" "}
              {monthView ? "neste mês" : "nesta semana"}
            </span>
          </div>

          {!monthView && (
            <div className="day-strip-head no-print">
              <span>Turnos por dia</span>
              <button
                type="button"
                className="btn ghost small month-toggle"
                aria-expanded={monthOpen}
                onClick={toggleMonth}
              >
                {monthOpen ? "Fechar mês" : "Mês"}
              </button>
            </div>
          )}

          {!monthView && monthOpen && (
            <div className="month-panel no-print">
              <div className="month-head">
                <button
                  type="button"
                  className="btn icon"
                  aria-label="Mês anterior"
                  onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
                >
                  <ArrowLeftIcon className="btn-icon" />
                </button>
                <div className="month-title">
                  <span className="month-kicker">Escolhe um dia</span>
                  <strong>{monthLabel(monthCursor)}</strong>
                </div>
                <button
                  type="button"
                  className="btn icon"
                  aria-label="Mês seguinte"
                  onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                >
                  <ArrowRightIcon className="btn-icon" />
                </button>
                <button
                  type="button"
                  className="month-close"
                  aria-label="Fechar calendário"
                  onClick={() => setMonthOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="month-weekdays" aria-hidden="true">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(
                  (label, index) => (
                    <span key={`${label}-${index}`}>{label}</span>
                  ),
                )}
              </div>

              <div className="month-grid">
                {monthCells.map((cell) => {
                  const counts = countsFor(cell.date);
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      className={`month-day${cell.inMonth ? "" : " outside"}${
                        cell.date === selectedDay ? " is-selected" : ""
                      }${cell.date === today ? " is-today" : ""}`}
                      aria-pressed={cell.date === selectedDay}
                      aria-label={`${weekdayShort(cell.date)} ${dayMonthLong(
                        cell.date,
                      )}: ${counts.A} no turno de dia e ${counts.B} no turno de noite`}
                      onClick={() => selectDay(cell.date, true)}
                    >
                      <span className="month-num">
                        {dayNumber(cell.date)}
                      </span>
                      <span className="month-dots" aria-hidden="true">
                        <i className={counts.A > 0 ? "on" : ""} />
                        <i className={counts.B > 0 ? "on" : ""} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid-scroll">
            <table className="roster">
              <caption className="sr-only">
                Horário de {periodLabel}
              </caption>
              <thead>
                {showGroups && (
                  <tr className="roster-groups">
                    <td className="roster-day" />
                    {visibleGroups.map((group) => (
                      <th
                        key={group.key}
                        scope="colgroup"
                        colSpan={group.employees.length}
                      >
                        {group.label}
                      </th>
                    ))}
                    <th
                      scope="colgroup"
                      colSpan={coverageColumns.length}
                      className="roster-cov-head"
                    >
                      Cobertura
                    </th>
                  </tr>
                )}
                <tr>
                  <th scope="col" className="roster-day">
                    Dias
                  </th>
                  {employees.map((employee) => (
                    <th key={employee.id} scope="col" className="roster-emp">
                      {employee.name}
                      {employee.role && <small>{employee.role}</small>}
                    </th>
                  ))}
                  {coverageColumns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="roster-cov-head"
                      title={column.title}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((date) => {
                  const weekend = isWeekendDay(date);
                  return (
                    <tr
                      key={date}
                      className={`${weekend ? "is-weekend" : ""}${
                        date === today ? " is-today" : ""
                      }${date === selectedDay ? " is-selected" : ""}`}
                    >
                      <th scope="row" className="roster-day">
                        {weekdayShort(date)} {dayNumber(date)}
                      </th>
                      {employees.map((employee) => {
                        const active = CELL_SHIFTS.filter((shift) =>
                          assigned.has(assignmentKey(date, employee.id, shift)),
                        );
                        const value = active.join("");
                        const known = CELL_OPTIONS.some(([key]) => key === value);
                        const time = active
                          .map((shift) =>
                            shiftTimeLabel(shiftTimeFor(state.settings, date, shift)),
                          )
                          .join(" e ");
                        return (
                          <td key={employee.id}>
                            <select
                              className={`roster-cell${
                                value === "" ? " off" : value === "C" ? " middle" : ""
                              }`}
                              value={value}
                              title={time || "Folga"}
                              aria-label={`${employee.name}, ${weekdayShort(
                                date,
                              )} ${dayMonth(date)}`}
                              onChange={(event) => {
                                const next = event.target.value;
                                for (const shift of CELL_SHIFTS) {
                                  if (active.includes(shift) !== next.includes(shift)) {
                                    onToggle(date, employee.id, shift);
                                  }
                                }
                              }}
                            >
                              {!known && <option value={value}>{value}</option>}
                              {CELL_OPTIONS.map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                      {coverageColumns.map(({ key, coverage, minimum }) => (
                        <td key={key} className="roster-cov">
                          {([0, 1] as const).map((index) => {
                            const shift: ShiftKey = index === 0 ? "A" : "B";
                            const count = coverage.get(date)?.[shift] ?? 0;
                            return (
                              <span
                                key={shift}
                                className={`cov${
                                  count < minimum[index] ? " low" : ""
                                }`}
                                title={`${SHIFT_NAMES[index]}: ${count} (mínimo ${minimum[index]})`}
                              >
                                <b>{count}</b>
                                {shift}
                              </span>
                            );
                          })}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {monthView && (
                  <tr>
                    <th scope="row" className="roster-day">
                      Folgas
                    </th>
                    {employees.map((employee) => {
                      const off = daysOff.get(employee.id);
                      if (!off) return <td key={employee.id} />;
                      return (
                        <td key={employee.id}>
                          <span
                            className={`total-hours${
                              off.days > MAX_MONTH_DAYS_OFF ? " over" : ""
                            }`}
                          >
                            {off.days}/{MAX_MONTH_DAYS_OFF}
                          </span>
                          <span
                            className={`total-contract${
                              off.sundays > MAX_MONTH_SUNDAYS_OFF ? " over" : ""
                            }`}
                          >
                            {off.sundays}/{MAX_MONTH_SUNDAYS_OFF} dom.
                          </span>
                        </td>
                      );
                    })}
                    <td colSpan={coverageColumns.length} className="roster-cov" />
                  </tr>
                )}
                <tr>
                  <th scope="row" className="roster-day">
                    Total
                  </th>
                  {employees.map((employee) => {
                    const minutes = employeeMinutes(state, employee.id, rows);
                    // O contrato é semanal, por isso só se compara na semana.
                    const over =
                      !monthView &&
                      employee.contractHours !== null &&
                      minutes > Math.round(employee.contractHours * 60);
                    return (
                      <td key={employee.id}>
                        <span className={`total-hours${over ? " over" : ""}`}>
                          {formatDuration(minutes)}
                        </span>
                        {employee.contractHours !== null && (
                          <span className="total-contract">
                            {monthView
                              ? `${employee.contractHours}h/semana`
                              : `de ${employee.contractHours}h`}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td colSpan={coverageColumns.length} className="roster-cov">
                    <span className="total-hours">
                      {formatDuration(shownMinutes)}
                    </span>
                    <span className="total-contract">
                      {filtered.length > 0 ? filtered[0].label : "equipa"}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <section className="card warnings">
          <h3>
            <WarningIcon className="warn-icon" />
            {monthView ? "Avisos do mês" : "Avisos da semana"}
            <span className="warn-count">{warnings.length}</span>
          </h3>
          <ul>
            {warnings.map((warning) => (
              <li key={warning.id} className={`warn-item ${warning.kind}`}>
                <span className="warn-dot" aria-hidden="true" />
                <span>{warning.message}</span>
              </li>
            ))}
          </ul>
          <p className="warn-foot">
            Podes ajustar os mínimos da equipa e dos pizzaiolos nas definições.
          </p>
        </section>
      )}

      {warnings.length === 0 && employeeCount > 0 && (
        <section className="all-good">
          <span className="all-good-dot" aria-hidden="true" />
          Sem avisos. Cobertura e contratos em dia.
        </section>
      )}

      <div className="print-only print-foot">
        <span>
          Mr Pizza · {periodLabel} · {formatDuration(totals.minutes)}{" "}
          atribuídas
        </span>
        <span>Gerado no gestor de horários</span>
      </div>
      <span className="sr-only">
        {weekLabel(week)}: {days
          .map(
            (date) =>
              `${weekdayShort(date)} ${dayMonthLong(date)} — ${coverage.get(date)?.A ?? 0} no turno de dia, ${coverage.get(date)?.B ?? 0} no turno de noite`,
          )
          .join("; ")}
      </span>
    </div>
  );
}
