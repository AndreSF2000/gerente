"use client";

import { useMemo } from "react";
import { SHIFT_NAMES } from "@/lib/defaults";
import {
  dayMonth,
  dayMonthLong,
  isoWeekNumber,
  isWeekendDay,
  todayISO,
  weekDays,
  weekLabel,
  weekdayLong,
  weekdayShort,
} from "@/lib/dates";
import {
  buildWeekWarnings,
  formatDuration,
  shiftTimeFor,
  shiftTimeLabel,
  weekTotals,
} from "@/lib/schedule";
import { isPizzaiolo } from "@/lib/team-groups";
import type { ScheduleState, ShiftKey } from "@/lib/types";
import { ArrowRightIcon, CheckIcon, TeamIcon, WarningIcon } from "./icons";

type Props = {
  state: ScheduleState;
  week: string;
  onOpenSchedule: () => void;
  onOpenDay: (date: string) => void;
  onGoTeam: () => void;
};

type DayCoverage = {
  teamA: number;
  teamB: number;
  pizzaiolosA: number;
  pizzaiolosB: number;
};

const EMPTY_COVERAGE: DayCoverage = {
  teamA: 0,
  teamB: 0,
  pizzaiolosA: 0,
  pizzaiolosB: 0,
};

export default function OverviewView({
  state,
  week,
  onOpenSchedule,
  onOpenDay,
  onGoTeam,
}: Props) {
  const today = todayISO();
  const days = useMemo(() => weekDays(week), [week]);
  const totals = useMemo(() => weekTotals(state, week), [state, week]);
  const warnings = useMemo(() => buildWeekWarnings(state, week), [state, week]);
  const employeeCount = state.employees.length;

  const coverage = useMemo(() => {
    const map = new Map<string, DayCoverage>();
    const byId = new Map(state.employees.map((employee) => [employee.id, employee]));
    for (const item of state.assignments) {
      const entry = map.get(item.date) ?? { ...EMPTY_COVERAGE };
      const employee = byId.get(item.employeeId);
      if (employee && isPizzaiolo(employee)) {
        if (item.shift === "A") entry.pizzaiolosA += 1;
        else entry.pizzaiolosB += 1;
      } else if (item.shift === "A") {
        entry.teamA += 1;
      } else {
        entry.teamB += 1;
      }
      map.set(item.date, entry);
    }
    return map;
  }, [state.assignments, state.employees]);

  const todayCoverage = coverage.get(today) ?? EMPTY_COVERAGE;

  const todayShifts = ([0, 1] as const).map((index) => {
    const shift: ShiftKey = index === 0 ? "A" : "B";
    const count = shift === "A" ? todayCoverage.teamA : todayCoverage.teamB;
    const pizzaiolos =
      shift === "A" ? todayCoverage.pizzaiolosA : todayCoverage.pizzaiolosB;
    const minimum = state.settings.minStaff[index];
    const pizzaioloMinimum = state.settings.minPizzaiolo[index];
    const assignedIds = new Set(
      state.assignments
        .filter((item) => item.date === today && item.shift === shift)
        .map((item) => item.employeeId),
    );
    const people = state.employees.filter((employee) =>
      assignedIds.has(employee.id),
    );
    return {
      shift,
      name: SHIFT_NAMES[index],
      time: shiftTimeLabel(shiftTimeFor(state.settings, today, shift)),
      count,
      pizzaiolos,
      minimum,
      pizzaioloMinimum,
      staffLow: minimum > 0 && count < minimum,
      pizzaiolosLow: pizzaioloMinimum > 0 && pizzaiolos < pizzaioloMinimum,
      people,
    };
  });

  const weekRows = days.map((date) => {
    const counts = coverage.get(date) ?? EMPTY_COVERAGE;
    const staffLow =
      (state.settings.minStaff[0] > 0 &&
        counts.teamA < state.settings.minStaff[0]) ||
      (state.settings.minStaff[1] > 0 &&
        counts.teamB < state.settings.minStaff[1]);
    const pizzaiolosLow =
      (state.settings.minPizzaiolo[0] > 0 &&
        counts.pizzaiolosA < state.settings.minPizzaiolo[0]) ||
      (state.settings.minPizzaiolo[1] > 0 &&
        counts.pizzaiolosB < state.settings.minPizzaiolo[1]);
    return {
      date,
      counts,
      staffLow,
      pizzaiolosLow,
      low: staffLow || pizzaiolosLow,
      empty:
        counts.teamA +
          counts.teamB +
          counts.pizzaiolosA +
          counts.pizzaiolosB ===
        0,
    };
  });

  return (
    <div className="overview">
      <section className="card overview-hero">
        <div className="overview-hero-top">
          <div>
            <span className="overview-kicker">
              Visão geral · Semana {isoWeekNumber(week)}
            </span>
            <h2 className="overview-title">
              Hoje é {weekdayLong(today).toLowerCase()}, {dayMonthLong(today)}.
            </h2>
            <p className="overview-sub">
              {weekLabel(week)} · {employeeCount}{" "}
              {employeeCount === 1 ? "colaborador" : "colaboradores"} na equipa
            </p>
          </div>
          <div className="overview-hero-actions">
            <button
              type="button"
              className="btn primary"
              onClick={employeeCount === 0 ? onGoTeam : onOpenSchedule}
            >
              {employeeCount === 0 ? "Adicionar equipa" : "Abrir horário"}
              <ArrowRightIcon className="btn-icon" />
            </button>
          </div>
        </div>

        <div className="overview-stats">
          <span className="ov-stat">
            <TeamIcon className="ov-stat-icon" />
            <strong>{employeeCount}</strong>{" "}
            {employeeCount === 1 ? "colaborador" : "colaboradores"}
          </span>
          <span className="ov-stat">
            <strong>{totals.people}</strong> com turnos
          </span>
          <span className="ov-stat">
            <strong>{formatDuration(totals.minutes)}</strong> atribuídas
          </span>
          <span className={warnings.length > 0 ? "ov-stat warn" : "ov-stat"}>
            <WarningIcon className="ov-stat-icon" />
            <strong>{warnings.length}</strong>{" "}
            {warnings.length === 1 ? "aviso" : "avisos"}
          </span>
        </div>
      </section>

      {employeeCount === 0 ? (
        <section className="card empty">
          <span className="empty-mark">
            <TeamIcon className="empty-icon" />
          </span>
          <h2>Ainda não tens equipa</h2>
          <p>
            Adiciona os colaboradores do Mr Pizza. Depois o resumo passa a
            mostrar os turnos de hoje, a cobertura da semana e os avisos.
          </p>
          <button type="button" className="btn primary" onClick={onGoTeam}>
            Adicionar colaboradores
          </button>
        </section>
      ) : (
        <>
          <div className="overview-grid">
            <section className="card today-card">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Hoje</h2>
                  <p className="section-desc">
                    {weekdayLong(today)}, {dayMonthLong(today)} · turnos e
                    cobertura
                  </p>
                </div>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => onOpenDay(today)}
                >
                  Editar
                </button>
              </div>

              <div className="today-shifts">
                {todayShifts.map((shift) => (
                  <div className="today-shift" key={shift.shift}>
                    <div className="today-shift-top">
                      <span className="shift-chip">{shift.name}</span>
                      <span className="today-time">{shift.time}</span>
                    </div>

                    <div className="today-people">
                      {shift.people.length === 0 ? (
                        <span className="today-empty">Ninguém atribuído</span>
                      ) : (
                        shift.people.map((employee) => (
                          <span
                            className="person-chip"
                            key={employee.id}
                            title={employee.role || undefined}
                          >
                            {employee.name}
                            {isPizzaiolo(employee) && <em>Pizzaiolo</em>}
                          </span>
                        ))
                      )}
                    </div>

                    <div className="today-foot">
                      <span
                        className="today-metric"
                        title="Equipa sem contar com os pizzaiolos"
                      >
                        Equipa
                        <b className={shift.staffLow ? "low" : "ok"}>
                          {shift.minimum > 0
                            ? `${shift.count}/${shift.minimum}`
                            : shift.count}
                        </b>
                      </span>
                      <span className="today-metric">
                        Pizzaiolos
                        <b className={shift.pizzaiolosLow ? "low" : "ok"}>
                          {shift.pizzaioloMinimum > 0
                            ? `${shift.pizzaiolos}/${shift.pizzaioloMinimum}`
                            : shift.pizzaiolos}
                        </b>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card alerts-card">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Avisos</h2>
                  <p className="section-desc">
                    {warnings.length === 0
                      ? "Sem avisos esta semana."
                      : `${warnings.length} ${
                          warnings.length === 1 ? "aviso" : "avisos"
                        } de cobertura, contratos ou turnos duplos.`}
                  </p>
                </div>
                {warnings.length > 0 && (
                  <span className="warn-count">{warnings.length}</span>
                )}
              </div>

              <div className="alerts-body">
                {warnings.length === 0 ? (
                  <p className="overview-clear">
                    <CheckIcon className="overview-clear-icon" />
                    Cobertura e contratos em dia. Bom trabalho.
                  </p>
                ) : (
                  <ul className="alert-list">
                    {warnings.slice(0, 3).map((warning) => (
                      <li
                        key={warning.id}
                        className={`warn-item ${warning.kind}`}
                      >
                        <span className="warn-dot" aria-hidden="true" />
                        <span>{warning.message}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="alerts-actions">
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={onOpenSchedule}
                  >
                    Ver no horário
                    <ArrowRightIcon className="btn-icon" />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section className="card overview-week">
            <div className="section-head">
              <div>
                <h2 className="section-title">Esta semana</h2>
                <p className="section-desc">
                  Toca num dia para abrir e editar esse dia.
                </p>
              </div>
              <button
                type="button"
                className="btn ghost small"
                onClick={onOpenSchedule}
              >
                Abrir
              </button>
            </div>

            <div className="ov-week-list">
              {weekRows.map((row) => {
                const status = row.low
                  ? "low"
                  : row.empty
                    ? "empty"
                    : "ok";
                return (
                  <button
                    type="button"
                    key={row.date}
                    className={`ov-week-row${
                      row.date === today ? " is-today" : ""
                    }${isWeekendDay(row.date) ? " is-weekend" : ""}`}
                    aria-label={`${weekdayLong(row.date)}, ${dayMonthLong(
                      row.date,
                    )}: equipa ${row.counts.teamA} de dia, ${
                      row.counts.teamB
                    } de noite; pizzaiolos ${
                      row.counts.pizzaiolosA
                    } de dia, ${row.counts.pizzaiolosB} de noite`}
                    onClick={() => onOpenDay(row.date)}
                  >
                    <span className="ov-week-day">
                      <b>{weekdayShort(row.date)}</b>
                      <span>{dayMonth(row.date)}</span>
                    </span>

                    <span className="ov-week-counts">
                      <span className="ov-count-row">
                        <span
                          className={`ov-count${
                            state.settings.minStaff[0] > 0 &&
                            row.counts.teamA < state.settings.minStaff[0]
                              ? " low"
                              : ""
                          }`}
                        >
                          <b>{row.counts.teamA}</b> dia
                        </span>
                        <span
                          className={`ov-count${
                            state.settings.minStaff[1] > 0 &&
                            row.counts.teamB < state.settings.minStaff[1]
                              ? " low"
                              : ""
                          }`}
                        >
                          <b>{row.counts.teamB}</b> noite
                        </span>
                      </span>
                      <span
                        className={`ov-piz-line${
                          row.pizzaiolosLow ? " low" : ""
                        }`}
                      >
                        Pizzaiolos: {row.counts.pizzaiolosA} dia ·{" "}
                        {row.counts.pizzaiolosB} noite
                      </span>
                    </span>

                    <span className={`ov-status ${status}`}>
                      {status === "ok" && (
                        <CheckIcon className="ov-status-icon" />
                      )}
                      {status === "low" && (
                        <WarningIcon className="ov-status-icon" />
                      )}
                      {status === "low"
                        ? "Falta"
                        : status === "empty"
                          ? "Sem turnos"
                          : "Coberto"}
                    </span>

                    <ArrowRightIcon className="ov-arrow" />
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
