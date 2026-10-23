"use client";

import { useState } from "react";
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
  const [contract, setContract] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(name, role, parseContract(contract));
    setName("");
    setRole("");
    setContract("");
  };

  const count = state.employees.length;

  return (
    <div className="team-view">
      <datalist id="role-options">
        {ROLE_SUGGESTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

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
            <input
              id="new-role"
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Pizzaiolo, cozinha, sala…"
              list="role-options"
              maxLength={40}
              autoComplete="off"
            />
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
                    <label className="sr-only" htmlFor={`role-${employee.id}`}>
                      Função de {employee.name}
                    </label>
                    <input
                      id={`role-${employee.id}`}
                      className="cell-input role-input"
                      value={employee.role}
                      onChange={(event) =>
                        onUpdate(employee.id, { role: event.target.value })
                      }
                      placeholder="Função"
                      list="role-options"
                      maxLength={40}
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
