"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { SHIFT_NAMES } from "@/lib/defaults";
import {
  addDays,
  addMonths,
  dayMonth,
  dayMonthLong,
  dayNumber,
  isWeekendDay,
  isoWeekNumber,
  monthCalendar,
  monthLabel,
  monthStart,
  todayISO,
  weekDays,
  weekLabel,
  weekStart,
  weekdayShort,
} from "@/lib/dates";
import {
  assignmentKey,
  buildWeekWarnings,
  employeeWeekMinutes,
  formatDuration,
  shiftTimeLabel,
  weekTotals,
} from "@/lib/schedule";
import {
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
  const totals = useMemo(() => weekTotals(state, week), [state, week]);
  const warnings = useMemo(() => buildWeekWarnings(state, week), [state, week]);
  const employeeGroups = useMemo(
    () => groupEmployees(state.employees),
    [state.employees],
  );
  const showGroups = hasEmployeeGroups(employeeGroups);

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
  const countsFor = (date: string) => coverage.get(date) ?? { A: 0, B: 0 };

  const goWeek = (delta: number) => {
    const nextDay = addDays(selectedDay, delta * 7);
    onWeekChange(addDays(week, delta * 7));
    setSelectedDay(nextDay);
    setMonthCursor(monthStart(nextDay));
  };

  const goToday = () => {
    const now = todayISO();
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
              aria-label="Semana anterior"
              onClick={() => goWeek(-1)}
            >
              <ArrowLeftIcon className="btn-icon" />
            </button>
            <div className="week-title">
              <span className="week-kicker">
                Semana {isoWeekNumber(week)}
                {currentWeek ? " · esta semana" : ""}
              </span>
              <h2 className="week-range">{weekLabel(week)}</h2>
            </div>
            <button
              type="button"
              className="btn icon"
              aria-label="Semana seguinte"
              onClick={() => goWeek(1)}
            >
              <ArrowRightIcon className="btn-icon" />
            </button>
          </div>

          <div className="week-actions">
            <button
              type="button"
              className="btn ghost"
              disabled={currentWeek}
              onClick={goToday}
            >
              Hoje
            </button>
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
          <strong>{weekLabel(week)}</strong>
          <span>Semana {isoWeekNumber(week)}</span>
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
            <span className="grid-hint">
              Clica num turno para atribuir ou remover.
            </span>
            <span className="grid-hint subtle">
              {totals.assignments} {totals.assignments === 1 ? "turno" : "turnos"}{" "}
              nesta semana
            </span>
          </div>

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

          {monthOpen && (
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

          <div
            className="mobile-day-strip no-print"
            role="group"
            aria-label="Dias da semana"
          >
            {days.map((date) => {
              const counts = countsFor(date);
              return (
                <button
                  key={date}
                  type="button"
                  className={`day-chip${
                    date === selectedDay ? " is-selected" : ""
                  }${date === today ? " is-today" : ""}`}
                  aria-pressed={date === selectedDay}
                  aria-label={`${weekdayShort(date)} ${dayMonthLong(
                    date,
                  )}: ${counts.A} no turno de dia e ${counts.B} no turno de noite`}
                  onClick={() => selectDay(date)}
                >
                  <span className="chip-dow">{weekdayShort(date)}</span>
                  <span className="chip-num">{dayNumber(date)}</span>
                  <span className="chip-counts" aria-hidden="true">
                    <i className={counts.A > 0 ? "on" : ""} />
                    <i className={counts.B > 0 ? "on" : ""} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid-scroll">
            <table className="schedule">
              <caption className="sr-only">
                Horário da semana de {weekLabel(week)}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="emp-col head">
                    Colaborador
                  </th>
                  {days.map((date) => (
                    <th
                      key={date}
                      scope="col"
                      className={`day-col${date === today ? " is-today" : ""}${
                        date !== selectedDay ? " mobile-day-hidden" : ""
                      }`}
                    >
                      <span className="dow">{weekdayShort(date)}</span>
                      <span className="date-num">{dayMonth(date)}</span>
                    </th>
                  ))}
                  <th scope="col" className="total-col head">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {employeeGroups.map((group) => (
                  <Fragment key={group.key}>
                    {showGroups && (
                      <tr className="employee-group-row">
                        <th scope="rowgroup" colSpan={days.length + 2}>
                          {group.label}
                        </th>
                      </tr>
                    )}
                    {group.employees.map((employee) => {
                      const minutes = employeeWeekMinutes(
                        state,
                        employee.id,
                        week,
                      );
                      const contractMinutes =
                        employee.contractHours !== null
                          ? Math.round(employee.contractHours * 60)
                          : null;
                      const over =
                        contractMinutes !== null && minutes > contractMinutes;
                      return (
                        <tr key={employee.id}>
                          <th scope="row" className="emp-col employee-cell">
                            <span className="emp-name">{employee.name}</span>
                            {employee.role && (
                              <span className="emp-role">{employee.role}</span>
                            )}
                            <span
                              className={`emp-mobile-total${
                                over ? " over" : ""
                              }`}
                            >
                              {formatDuration(minutes)}
                              {employee.contractHours !== null && (
                                <small> / {employee.contractHours}h</small>
                              )}
                            </span>
                          </th>
                          {days.map((date) => (
                            <td
                              key={date}
                              className={`shift-cell${
                                date === today ? " is-today" : ""
                              }${date !== selectedDay ? " mobile-day-hidden" : ""}`}
                            >
                              {SHIFT_NAMES.map((name, index) => {
                                const shift: ShiftKey =
                                  index === 0 ? "A" : "B";
                                const time = state.settings[
                                  isWeekendDay(date) ? "weekend" : "weekday"
                                ][index];
                                const active = assigned.has(
                                  assignmentKey(date, employee.id, shift),
                                );
                                return (
                                  <button
                                    key={shift}
                                    type="button"
                                    className="shift-btn"
                                    aria-pressed={active}
                                    aria-label={`${employee.name}: ${name}, ${weekdayShort(date)} ${dayMonth(date)}`}
                                    onClick={() =>
                                      onToggle(date, employee.id, shift)
                                    }
                                  >
                                    <span className="s-name">{name}</span>
                                    <span className="s-time">
                                      {shiftTimeLabel(time)}
                                    </span>
                                  </button>
                                );
                              })}
                            </td>
                          ))}
                          <td className="total-cell">
                            <span
                              className={`total-hours${over ? " over" : ""}`}
                            >
                              {formatDuration(minutes)}
                            </span>
                            {employee.contractHours !== null && (
                              <span className="total-contract">
                                de {employee.contractHours}h
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="emp-col coverage-label">
                    Equipa
                  </th>
                  {days.map((date) => {
                    const counts = teamCoverage.get(date) ?? { A: 0, B: 0 };
                    return (
                      <td
                        key={date}
                        className={`coverage-cell${
                          date !== selectedDay ? " mobile-day-hidden" : ""
                        }`}
                      >
                        {([0, 1] as const).map((index) => {
                          const shift: ShiftKey = index === 0 ? "A" : "B";
                          const count = counts[shift];
                          const minimum = state.settings.minStaff[index];
                          const low = count < minimum;
                          return (
                            <span
                              key={shift}
                              className={`cov${low ? " low" : ""}`}
                              title={`Equipa no turno de ${SHIFT_NAMES[
                                index
                              ].toLowerCase()}: ${count} ${
                                count === 1 ? "pessoa" : "pessoas"
                              } (mínimo ${minimum}, sem pizzaiolos)`}
                            >
                              <b>{count}</b>
                              {shift}
                            </span>
                          );
                        })}
                      </td>
                    );
                  })}
                  <td className="total-cell coverage-total">
                    <span className="total-hours">
                      {formatDuration(totals.minutes)}
                    </span>
                    <span className="total-contract">equipa</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="emp-col coverage-label">
                    Pizzaiolos
                  </th>
                  {days.map((date) => {
                    const counts = pizzaioloCoverage.get(date) ?? {
                      A: 0,
                      B: 0,
                    };
                    return (
                      <td
                        key={date}
                        className={`coverage-cell${
                          date !== selectedDay ? " mobile-day-hidden" : ""
                        }`}
                      >
                        {([0, 1] as const).map((index) => {
                          const shift: ShiftKey = index === 0 ? "A" : "B";
                          const count = counts[shift];
                          const minimum = state.settings.minPizzaiolo[index];
                          const low = count < minimum;
                          return (
                            <span
                              key={shift}
                              className={`cov${low ? " low" : ""}`}
                              title={`Pizzaiolos no turno de ${SHIFT_NAMES[
                                index
                              ].toLowerCase()}: ${count} (mínimo ${minimum})`}
                            >
                              <b>{count}</b>
                              {shift}
                            </span>
                          );
                        })}
                      </td>
                    );
                  })}
                  <td className="total-cell coverage-total" />
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
            Avisos da semana
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
          Mr Pizza · {weekLabel(week)} · {formatDuration(totals.minutes)}{" "}
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
