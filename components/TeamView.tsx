"use client";

import { useMemo, useState } from "react";
import { ROLE_SUGGESTIONS } from "@/lib/defaults";
import { employeeWeekMinutes, formatDuration } from "@/lib/schedule";
import type { Employee, ScheduleState } from "@/lib/types";
import { PlusIcon, TrashIcon } from "./icons";

type Props = {
  state: ScheduleState;
  week: string;
  onAdd: (name: string, role: string, contractHours: number | null) => void;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
  onRemove: (id: string) => void;
};

const CUSTOM_ROLE = "__custom__";

/** Sugestões fixas mais as funções que já existem na equipa. */
function roleChoices(employees: Employee[], current = ""): string[] {
  const values = new Set<string>(ROLE_SUGGESTIONS);
  for (const employee of employees) {
    const role = employee.role.trim();
    if (role) values.add(role);
  }
  if (current.trim()) values.add(current.trim());
  return Array.from(values);
}

function RoleCell({
  employee,
  employees,
  onUpdate,
}: {
  employee: Employee;
  employees: Employee[];
  onUpdate: (id: string, patch: Partial<Employee>) => void;
}) {
  const [custom, setCustom] = useState(false);
  const choices = useMemo(
    () => roleChoices(employees, employee.role),
    [employees, employee.role],
  );

  return (
    <div className="role-cell">
      <label className="sr-only" htmlFor={`role-${employee.id}`}>
        Função de {employee.name}
      </label>
      <select
        id={`role-${employee.id}`}
        className="cell-input role-input role-select"
        value={custom ? CUSTOM_ROLE : employee.role}
        onChange={(event) => {
          const value = event.target.value;
          if (value === CUSTOM_ROLE) {
            setCustom(true);
            return;
          }
          setCustom(false);
          onUpdate(employee.id, { role: value });
        }}
      >
        <option value="">Sem função</option>
        {choices.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={CUSTOM_ROLE}>Outra função…</option>
      </select>

      {custom && (
        <input
          className="cell-input role-custom"
          value={employee.role}
          onChange={(event) =>
            onUpdate(employee.id, { role: event.target.value })
          }
          placeholder="Escreve a função"
          maxLength={40}
          autoComplete="off"
          aria-label={`Escrever a função de ${employee.name}`}
        />
      )}
    </div>
  );
}

const AVATAR_COLORS = [
  "#c8322b",
  "#a5542a",
  "#7a5c2e",
  "#4b7a5a",
  "#3f6c8a",
  "#6d5388",
  "#a3436b",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function parseContract(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(168, Math.max(0, parsed));
}

export default function TeamView({
  state,
  week,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState(false);
  const [contract, setContract] = useState("");
  const roleOptions = useMemo(
    () => roleChoices(state.employees),
    [state.employees],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(name, role, parseContract(contract));
    setName("");
    setRole("");
    setCustomRole(false);
    setContract("");
  };

  const count = state.employees.length;

  return (
    <div className="team-view">
      <section className="card team-card">
        <div className="section-head">
          <div>
            <h2 className="section-title">Equipa</h2>
            <p className="section-desc">
              Nomes, funções e horas de contrato. Tudo é guardado
              automaticamente. A função “Pizzaiolo” separa a pessoa no horário.
            </p>
          </div>
          <span className="pill">
            {count} {count === 1 ? "pessoa" : "pessoas"}
          </span>
        </div>

        <form className="add-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="new-name">Nome</label>
            <input
              id="new-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Ana Silva"
              maxLength={60}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="new-role">Função</label>
            <select
              id="new-role"
              className="input role-select"
              value={customRole ? CUSTOM_ROLE : role}
              onChange={(event) => {
                const value = event.target.value;
                if (value === CUSTOM_ROLE) {
                  setCustomRole(true);
                  setRole("");
                  return;
                }
                setCustomRole(false);
                setRole(value);
              }}
            >
              <option value="">Sem função</option>
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={CUSTOM_ROLE}>Outra função…</option>
            </select>
            {customRole && (
              <input
                className="input role-custom"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Escreve a função"
                maxLength={40}
                autoComplete="off"
                autoFocus
                aria-label="Escrever outra função"
              />
            )}
          </div>
          <div className="field field-hours">
            <label htmlFor="new-contract">Contrato (h/semana)</label>
            <input
              id="new-contract"
              className="input"
              type="number"
              min={0}
              max={168}
              step={0.5}
              value={contract}
              onChange={(event) => setContract(event.target.value)}
              placeholder="40"
            />
          </div>
          <button
            className="btn primary add-button"
            type="submit"
            disabled={!name.trim()}
          >
            <PlusIcon className="btn-icon" />
            Adicionar
          </button>
        </form>

        {count === 0 ? (
          <div className="empty compact">
            <h3>Equipa vazia</h3>
            <p>
              Adiciona o primeiro colaborador para começares a montar o horário.
            </p>
          </div>
        ) : (
          <div className="team-list">
            <div className="team-list-head" aria-hidden="true">
              <span />
              <span>Colaborador</span>
              <span>Contrato</span>
              <span>Horas na semana</span>
              <span />
            </div>
            {state.employees.map((employee) => {
              const minutes = employeeWeekMinutes(state, employee.id, week);
              return (
                <div className="team-row" key={employee.id}>
                  <span
                    className="avatar"
                    style={{ background: avatarColor(employee.name) }}
                    aria-hidden="true"
                  >
                    {initials(employee.name)}
                  </span>

                  <div className="identity">
                    <label className="sr-only" htmlFor={`name-${employee.id}`}>
                      Nome de {employee.name}
                    </label>
                    <input
                      id={`name-${employee.id}`}
                      className="cell-input name-input"
                      value={employee.name}
                      onChange={(event) =>
                        onUpdate(employee.id, { name: event.target.value })
                      }
                      maxLength={60}
                    />
                    <RoleCell
                      employee={employee}
                      employees={state.employees}
                      onUpdate={onUpdate}
                    />
                  </div>

                  <div className="contract-field">
                    <label className="sr-only" htmlFor={`hours-${employee.id}`}>
                      Horas de contrato de {employee.name}
                    </label>
                    <input
                      id={`hours-${employee.id}`}
                      className="input hours-input"
                      type="number"
                      min={0}
                      max={168}
                      step={0.5}
                      value={employee.contractHours ?? ""}
                      onChange={(event) =>
                        onUpdate(employee.id, {
                          contractHours: parseContract(event.target.value),
                        })
                      }
                      placeholder="—"
                    />
                    <span className="unit">h/semana</span>
                  </div>

                  <div className="weekly-hours">
                    <strong>{formatDuration(minutes)}</strong>
                    <span>atribuídas</span>
                  </div>

                  <button
                    type="button"
                    className="btn icon danger"
                    onClick={() => onRemove(employee.id)}
                    aria-label={`Remover ${employee.name}`}
                    title="Remover colaborador"
                  >
                    <TrashIcon className="btn-icon" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
