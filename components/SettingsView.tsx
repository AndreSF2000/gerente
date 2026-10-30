"use client";

import { useEffect, useState } from "react";
import { MIDDLE_NAME, SHIFT_NAMES } from "@/lib/defaults";
import {
  formatDuration,
  shiftMinutes,
  timeToMinutes,
} from "@/lib/schedule";
import type {
  ScheduleState,
  Settings,
  ShiftTime,
  StorageMode,
} from "@/lib/types";
import { DownloadIcon, UploadIcon } from "./icons";

type Props = {
  state: ScheduleState;
  mode: StorageMode;
  savedAt: string | null;
  onChangeSettings: (settings: Settings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function TimeInput({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (TIME_RE.test(draft) && draft !== value) {
      onChange(draft);
    } else {
      setDraft(value);
    }
  };

  return (
    <input
      type="time"
      step={900}
      className="input time-input"
      value={draft}
      aria-label={label}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

const MINIMUM_OPTIONS = Array.from({ length: 51 }, (_, index) => index);

function MinimumSelect({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <select
      className="input min-input min-select"
      value={value}
      aria-label={label}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {MINIMUM_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function formatMoment(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function SettingsView({
  state,
  mode,
  savedAt,
  onChangeSettings,
  onExport,
  onImport,
}: Props) {
  const { settings } = state;

  const updateTime = (
    group: "weekday" | "weekend",
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    // O índice 2 é o intermédio, guardado à parte por grupo de dias.
    const key = index === 2 ? "middle" : group;
    const slot = index === 2 ? (group === "weekday" ? 0 : 1) : index;
    const pair = [...settings[key]] as [ShiftTime, ShiftTime];
    pair[slot] = { ...pair[slot], [field]: value };
    onChangeSettings({ ...settings, [key]: pair });
  };

  const updateMinimum = (
    key: "minStaff" | "minPizzaiolo",
    index: number,
    value: number,
  ) => {
    const next = { ...settings };
    const pair = [...next[key]] as [number, number];
    pair[index] = Math.min(50, Math.max(0, Math.round(value)));
    next[key] = pair;
    onChangeSettings(next);
  };

  const groups = [
    {
      key: "weekday" as const,
      title: "Segunda a quinta e domingo",
      description:
        "Dia, noite e intermédio, com o fim a poder passar da meia-noite.",
    },
    {
      key: "weekend" as const,
      title: "Sexta e sábado",
      description: "Horário próprio de fim de semana.",
    },
  ];

  const modeInfo: Record<
    StorageMode,
    { label: string; detail: string; tone: string }
  > = {
    supabase: {
      label: "Base de dados Supabase",
      detail: "Sincroniza automaticamente entre dispositivos.",
      tone: "ok",
    },
    file: {
      label: "Ficheiro local",
      detail: "Modo de desenvolvimento: guardado em .data/schedule.json.",
      tone: "neutral",
    },
    local: {
      label: "Apenas este navegador",
      detail: "Sem base de dados ligada: os dados não passam para outros dispositivos.",
      tone: "warn",
    },
  };

  return (
    <div className="settings-view">
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">Turnos</h2>
            <p className="section-desc">
              Estes horários aplicam-se a todas as semanas. Os turnos já
              atribuídos mantêm as pessoas.
            </p>
          </div>
        </div>

        {groups.map((group) => (
          <div className="shift-group" key={group.key}>
            <div className="shift-group-head">
              <h3>{group.title}</h3>
              <p>{group.description}</p>
            </div>
            {[0, 1, 2].map((index) => {
              const time =
                index === 2
                  ? settings.middle[group.key === "weekday" ? 0 : 1]
                  : settings[group.key][index];
              const name = index === 2 ? MIDDLE_NAME : SHIFT_NAMES[index];
              const overnight = timeToMinutes(time.end) <= timeToMinutes(time.start);
              return (
                <div className="shift-row" key={index}>
                  <span className="shift-label">
                    <b>{name}</b>
                    <span>
                      {formatDuration(shiftMinutes(time))}
                      {overnight ? " · termina no dia seguinte" : ""}
                    </span>
                  </span>
                  <TimeInput
                    value={time.start}
                    label={`Início do turno ${name.toLowerCase()} (${group.title})`}
                    onChange={(value) =>
                      updateTime(group.key, index, "start", value)
                    }
                  />
                  <span className="shift-dash" aria-hidden="true">
                    →
                  </span>
                  <TimeInput
                    value={time.end}
                    label={`Fim do turno ${name.toLowerCase()} (${group.title})`}
                    onChange={(value) =>
                      updateTime(group.key, index, "end", value)
                    }
                  />
                </div>
              );
            })}
          </div>
        ))}
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">Cobertura mínima</h2>
            <p className="section-desc">
              Quantas pessoas da equipa queres ter, no mínimo, em cada turno,
              sem contar com os pizzaiolos. Abaixo deste número aparece um aviso
              no horário. O mínimo dos pizzaiolos é verificado à parte.
            </p>
          </div>
        </div>
        <div className="min-grid">
          <div className="min-group-label">
            Equipa (sem pizzaiolos)
            <span>Os pizzaiolos contam no mínimo próprio abaixo.</span>
          </div>
          {SHIFT_NAMES.map((name, index) => (
            <div className="min-row" key={`staff-${name}`}>
              <span className="shift-label">
                <b>{name}</b>
              </span>
              <MinimumSelect
                value={settings.minStaff[index]}
                label={`Mínimo de pessoas no turno de ${name.toLowerCase()}`}
                onChange={(value) => updateMinimum("minStaff", index, value)}
              />
              <span className="unit">
                {settings.minStaff[index] === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>
          ))}

          <div className="min-group-label">
            Pizzaiolos
            <span>Normalmente 1 de dia e 1 de noite.</span>
          </div>
          {SHIFT_NAMES.map((name, index) => (
            <div className="min-row" key={`pizzaiolo-${name}`}>
              <span className="shift-label">
                <b>{name}</b>
              </span>
              <MinimumSelect
                value={settings.minPizzaiolo[index]}
                label={`Mínimo de pizzaiolos no turno de ${name.toLowerCase()}`}
                onChange={(value) =>
                  updateMinimum("minPizzaiolo", index, value)
                }
              />
              <span className="unit">
                {settings.minPizzaiolo[index] === 1
                  ? "pizzaiolo"
                  : "pizzaiolos"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">Dados e backup</h2>
            <p className="section-desc">
              Exporta uma cópia para guardar ou para abrir noutro dispositivo.
            </p>
          </div>
        </div>

        <div className="data-body">
          <div className="data-row">
            <span className="data-label">Armazenamento</span>
            <span className={`mode-badge ${modeInfo[mode].tone}`}>
              <span className="mode-dot" aria-hidden="true" />
              {modeInfo[mode].label}
            </span>
          </div>
          <p className="data-detail">{modeInfo[mode].detail}</p>

          <div className="data-row">
            <span className="data-label">Última gravação</span>
            <span className="data-value">{formatMoment(savedAt)}</span>
          </div>

          <div className="data-actions">
            <button type="button" className="btn" onClick={onExport}>
              <DownloadIcon className="btn-icon" />
              Exportar backup
            </button>
            <label className="btn">
              <UploadIcon className="btn-icon" />
              Importar backup
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImport(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {mode === "local" && (
            <p className="inline-note">
              Para usar o horário no telemóvel e no computador ao mesmo tempo,
              liga um projeto Supabase ao site na Vercel (variáveis{" "}
              <code>SUPABASE_URL</code> e <code>SUPABASE_SECRET_KEY</code>). Sem
              isso, o backup é a forma de passar os dados entre dispositivos.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
