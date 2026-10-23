"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { defaultState } from "@/lib/defaults";
import { addDays, todayISO, weekDays, weekStart } from "@/lib/dates";
import { sanitizeState } from "@/lib/sanitize";
import { APP_VERSION } from "@/lib/version";
import type {
  Employee,
  ScheduleState,
  Settings,
  ShiftKey,
  StorageMode,
} from "@/lib/types";
import OverviewView from "./OverviewView";
import ScheduleView from "./ScheduleView";
import SettingsView from "./SettingsView";
import TeamView from "./TeamView";
import WhatsAppExport from "./WhatsAppExport";
import { PizzaIcon, PrinterIcon, WhatsAppIcon } from "./icons";

const LOCAL_KEY = "mr-pizza-schedule-v1";

type Tab = "overview" | "schedule" | "team" | "settings";
type SaveStatus = "idle" | "saving" | "saved" | "error";

function readLocalState(): ScheduleState | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalState(state: ScheduleState): void {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
}

function formatSavedAt(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <PizzaIcon className="brand-icon" />
      </span>
      <div className="brand-text">
        <span className="brand-name">Mr Pizza</span>
        <span className="brand-sub">Horários da equipa</span>
      </div>
    </div>
  );
}

function SaveIndicator({
  status,
  savedAt,
  onRetry,
}: {
  status: SaveStatus;
  savedAt: string | null;
  onRetry: () => void;
}) {
  if (status === "error") {
    return (
      <span className="save-pill error" role="status">
        <span className="save-dot" />
        Não guardado
        <button type="button" className="save-retry" onClick={onRetry}>
          Tentar
        </button>
      </span>
    );
  }

  const label =
    status === "saving"
      ? "A guardar…"
      : savedAt
        ? `Guardado às ${formatSavedAt(savedAt)}`
        : "Guardado";

  return (
    <span className={`save-pill ${status}`} role="status">
      <span className="save-dot" />
      {label}
    </span>
  );
}

export default function ScheduleApp() {
  const [state, setState] = useState<ScheduleState | null>(null);
  const [mode, setMode] = useState<StorageMode>("supabase");
  const [week, setWeek] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localBackup, setLocalBackup] = useState<ScheduleState | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const dirtyRef = useRef(false);

  // Evita o zoom por pinça no iPhone, que desalinha a tabela e os botões.
  useEffect(() => {
    const preventGesture = (event: Event) => event.preventDefault();
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    document.addEventListener("gestureend", preventGesture);
    document.addEventListener("touchmove", preventMultiTouch, {
      passive: false,
    });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventMultiTouch);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setWeek(weekStart(todayISO()));
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (response.status === 503) {
          const payload = (await response.json().catch(() => null)) as {
            code?: string;
          } | null;
          if (payload?.code === "no-database") {
            if (cancelled) return;
            setMode("local");
            setState(readLocalState() ?? defaultState());
            setNotice(
              "Base de dados ainda não ligada. As alterações ficam guardadas só neste navegador — liga o Supabase para sincronizar entre dispositivos.",
            );
            return;
          }
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const loadedState = sanitizeState(payload?.state);
        if (!loadedState) throw new Error("Estado inválido");
        if (cancelled) return;
        setState(loadedState);
        setMode(payload.mode === "file" ? "file" : "supabase");
        setSavedAt(typeof payload.updatedAt === "string" ? payload.updatedAt : null);

        const local = readLocalState();
        if (
          local &&
          local.employees.length + local.assignments.length > 0 &&
          loadedState.employees.length === 0 &&
          loadedState.assignments.length === 0
        ) {
          setLocalBackup(local);
        }
      } catch {
        if (cancelled) return;
        setMode("local");
        setState(readLocalState() ?? defaultState());
        setNotice(
          "Sem ligação ao servidor. As alterações ficam guardadas só neste navegador.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (next: ScheduleState) => {
      if (mode === "local") {
        try {
          writeLocalState(next);
          setSavedAt(new Date().toISOString());
          setStatus("saved");
        } catch {
          setStatus("error");
        }
        return;
      }

      try {
        const response = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json().catch(() => null)) as {
          updatedAt?: string;
        } | null;
        setSavedAt(payload?.updatedAt ?? new Date().toISOString());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    },
    [mode],
  );

  useEffect(() => {
    if (!state || !dirtyRef.current) return;
    dirtyRef.current = false;
    setStatus("saving");
    const timeout = window.setTimeout(() => void persist(state), 550);
    return () => window.clearTimeout(timeout);
  }, [state, persist]);

  const commit = useCallback(
    (updater: (current: ScheduleState) => ScheduleState) => {
      dirtyRef.current = true;
      setState((current) => (current ? updater(current) : current));
    },
    [],
  );

  const toggleAssignment = useCallback(
    (date: string, employeeId: string, shift: ShiftKey) => {
      commit((current) => {
        const exists = current.assignments.some(
          (item) =>
            item.date === date &&
            item.employeeId === employeeId &&
            item.shift === shift,
        );
        return {
          ...current,
          assignments: exists
            ? current.assignments.filter(
                (item) =>
                  !(
                    item.date === date &&
                    item.employeeId === employeeId &&
                    item.shift === shift
                  ),
              )
            : [...current.assignments, { date, employeeId, shift }],
        };
      });
    },
    [commit],
  );

  const addEmployee = useCallback(
    (name: string, role: string, contractHours: number | null) => {
      const employee: Employee = {
        id: newId(),
        name: name.trim(),
        role: role.trim(),
        contractHours,
      };
      commit((current) => ({
        ...current,
        employees: [...current.employees, employee],
      }));
    },
    [commit],
  );

  const updateEmployee = useCallback(
    (id: string, patch: Partial<Employee>) => {
      commit((current) => ({
        ...current,
        employees: current.employees.map((employee) =>
          employee.id === id ? { ...employee, ...patch } : employee,
        ),
      }));
    },
    [commit],
  );

  const removeEmployee = useCallback(
    (id: string) => {
      const employee = state?.employees.find((item) => item.id === id);
      if (!employee) return;
      if (
        !window.confirm(
          `Remover ${employee.name}? Os turnos atribuídos também serão removidos.`,
        )
      ) {
        return;
      }
      commit((current) => ({
        ...current,
        employees: current.employees.filter((item) => item.id !== id),
        assignments: current.assignments.filter(
          (item) => item.employeeId !== id,
        ),
      }));
    },
    [state, commit],
  );

  const updateSettings = useCallback(
    (settings: Settings) => {
      commit((current) => ({ ...current, settings }));
    },
    [commit],
  );

  const copyPreviousWeek = useCallback(() => {
    if (!state || !week) return;
    const currentDays = new Set(weekDays(week));
    const previousDays = new Set(weekDays(addDays(week, -7)));
    const employeeIds = new Set(state.employees.map((item) => item.id));
    const source = state.assignments.filter(
      (item) =>
        previousDays.has(item.date) && employeeIds.has(item.employeeId),
    );
    if (source.length === 0) return;

    const currentCount = state.assignments.filter((item) =>
      currentDays.has(item.date),
    ).length;
    if (
      currentCount > 0 &&
      !window.confirm(
        "Esta semana já tem turnos. Queres substituí-los pelo horário da semana anterior?",
      )
    ) {
      return;
    }

    const copied = source.map((item) => ({
      ...item,
      date: addDays(item.date, 7),
    }));
    commit((current) => ({
      ...current,
      assignments: [
        ...current.assignments.filter((item) => !currentDays.has(item.date)),
        ...copied,
      ],
    }));
  }, [state, week, commit]);

  const exportState = useCallback(() => {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mr-pizza-horarios-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importState = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const imported = sanitizeState(JSON.parse(text));
        if (!imported) {
          window.alert("O ficheiro não é um backup válido do Mr Pizza.");
          return;
        }
        if (!window.confirm("Substituir os dados atuais pelo conteúdo do backup?")) {
          return;
        }
        commit(() => imported);
        setNotice("Backup importado. As alterações estão a ser guardadas.");
      } catch {
        window.alert("Não foi possível ler o ficheiro.");
      }
    },
    [commit],
  );

  const retrySave = useCallback(() => {
    if (!state) return;
    setStatus("saving");
    void persist(state);
  }, [state, persist]);

  const importLocalBackup = useCallback(() => {
    if (!localBackup) return;
    commit(() => localBackup);
    setLocalBackup(null);
    setNotice("Dados deste dispositivo importados para o horário online.");
  }, [localBackup, commit]);

  const closeExport = useCallback(() => {
    setExportOpen(false);
    requestAnimationFrame(() => exportButtonRef.current?.focus());
  }, []);

  const openSchedule = useCallback(() => {
    setFocusDay(null);
    setTab("schedule");
  }, []);

  const openDay = useCallback((date: string) => {
    setFocusDay(date);
    setWeek(weekStart(date));
    setTab("schedule");
  }, []);

  if (!state || !week) {
    return (
      <div className="boot-screen" role="status" aria-live="polite">
        <span className="sr-only">A carregar o horário…</span>

        <div className="boot-stage" aria-hidden="true">
          <span className="boot-halo" />
          <span className="boot-ring" />
          <span className="boot-mark">
            <PizzaIcon className="boot-icon" />
          </span>
        </div>

        <div className="boot-copy" aria-hidden="true">
          <span className="boot-name">Mr Pizza</span>
          <span className="boot-caption">
            A preparar o horário
            <span className="boot-dots">
              <i />
              <i />
              <i />
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar no-print">
        <h1 className="sr-only">Mr Pizza — horários da equipa</h1>
        <Brand />
        <div className="topbar-actions">
          <SaveIndicator status={status} savedAt={savedAt} onRetry={retrySave} />
          {tab === "schedule" && (
            <>
              <button
                type="button"
                className="btn whatsapp"
                ref={exportButtonRef}
                onClick={() => setExportOpen(true)}
                disabled={state.employees.length === 0}
                aria-label="Exportar horário para enviar no WhatsApp"
                title={
                  state.employees.length === 0
                    ? "Adiciona a equipa antes de exportar"
                    : "Exportar horário para WhatsApp"
                }
              >
                <WhatsAppIcon className="btn-icon" />
                WhatsApp
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => window.print()}
              >
                <PrinterIcon className="btn-icon" />
                Imprimir
              </button>
            </>
          )}
        </div>
      </header>

      <nav className="tabs no-print" aria-label="Secções">
        <button
          type="button"
          className="tab"
          aria-current={tab === "overview" ? "page" : undefined}
          onClick={() => setTab("overview")}
        >
          Resumo
        </button>
        <button
          type="button"
          className="tab"
          aria-current={tab === "schedule" ? "page" : undefined}
          onClick={openSchedule}
        >
          Horário
        </button>
        <button
          type="button"
          className="tab"
          aria-current={tab === "team" ? "page" : undefined}
          onClick={() => setTab("team")}
        >
          Equipa
          <span className="tab-count">{state.employees.length}</span>
        </button>
        <button
          type="button"
          className="tab"
          aria-current={tab === "settings" ? "page" : undefined}
          onClick={() => setTab("settings")}
        >
          Definições
        </button>
      </nav>

      {notice && (
        <div className="banner no-print" role="status">
          <span>{notice}</span>
          <button
            type="button"
            className="banner-close"
            aria-label="Fechar aviso"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {localBackup && (
        <div className="banner action-banner no-print" role="status">
          <span>
            Este dispositivo tem {localBackup.employees.length}{" "}
            {localBackup.employees.length === 1 ? "pessoa" : "pessoas"} e{" "}
            {localBackup.assignments.length}{" "}
            {localBackup.assignments.length === 1 ? "turno" : "turnos"}{" "}
            guardados localmente. Queres enviá-los para o horário online?
          </span>
          <span className="banner-actions">
            <button
              type="button"
              className="btn primary small"
              onClick={importLocalBackup}
            >
              Importar dados
            </button>
            <button
              type="button"
              className="banner-close"
              aria-label="Ignorar dados locais"
              onClick={() => setLocalBackup(null)}
            >
              ×
            </button>
          </span>
        </div>
      )}

      <main className="main">
        {tab === "overview" && (
          <OverviewView
            state={state}
            week={week}
            onOpenSchedule={openSchedule}
            onOpenDay={openDay}
            onGoTeam={() => setTab("team")}
          />
        )}

        {tab === "schedule" && (
          <ScheduleView
            state={state}
            week={week}
            initialDay={focusDay ?? undefined}
            onWeekChange={setWeek}
            onToggle={toggleAssignment}
            onCopyPrevious={copyPreviousWeek}
            onGoTeam={() => setTab("team")}
          />
        )}

        {tab === "team" && (
          <TeamView
            state={state}
            week={week}
            onAdd={addEmployee}
            onUpdate={updateEmployee}
            onRemove={removeEmployee}
          />
        )}

        {tab === "settings" && (
          <SettingsView
            state={state}
            mode={mode}
            savedAt={savedAt}
            onChangeSettings={updateSettings}
            onExport={exportState}
            onImport={importState}
          />
        )}
      </main>

      <footer className="footer no-print">
        <span>
          Mr Pizza · horários da equipa · {APP_VERSION}
        </span>
        <span>Os turnos são guardados automaticamente.</span>
      </footer>

      {exportOpen && (
        <WhatsAppExport state={state} week={week} onClose={closeExport} />
      )}
    </div>
  );
}
