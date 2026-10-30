"use client";

import { useCallback, useState, type FormEvent } from "react";
import { PizzaIcon } from "@/components/icons";

const MAX_DIGITS = 12;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export default function EntrarPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const press = useCallback((key: string) => {
    setError(null);
    if (key === "back") setPin((current) => current.slice(0, -1));
    else if (key === "clear") setPin("");
    else setPin((current) => (current.length < MAX_DIGITS ? current + key : current));
  }, []);

  const submit = useCallback(async () => {
    if (!pin || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (response.ok) {
        window.location.replace("/");
        return;
      }
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(payload?.message ?? "Não foi possível entrar.");
      setPin("");
    } catch {
      setError("Sem ligação. Tenta outra vez.");
    }
    setBusy(false);
  }, [pin, busy]);

  return (
    <main className="pin-page">
      <form
        className="card pin-card"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit();
        }}
      >
        <span className="brand-mark" aria-hidden="true">
          <PizzaIcon className="brand-icon" />
        </span>
        <h1 className="brand-name">Mr Pizza</h1>
        <p className="pin-sub">Escreve o PIN para abrir o horário.</p>

        {/* Computador: campo normal. Telemóvel: teclado numérico (ver CSS). */}
        <label className="sr-only" htmlFor="pin">
          PIN de acesso
        </label>
        <input
          id="pin"
          className="input pin-input"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          value={pin}
          maxLength={MAX_DIGITS}
          onChange={(event) => {
            setError(null);
            setPin(event.target.value.replace(/\D/g, ""));
          }}
        />

        <div
          className={`pin-dots${error ? " is-error" : ""}`}
          role="status"
          aria-label={`${pin.length} ${pin.length === 1 ? "número" : "números"} escritos`}
        >
          {pin.length === 0 ? (
            <span className="pin-placeholder">PIN</span>
          ) : (
            Array.from({ length: pin.length }, (_, index) => <i key={index} />)
          )}
        </div>

        {error && (
          <p className="pin-error" role="alert">
            {error}
          </p>
        )}

        <div className="pin-pad">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`pin-key${key.length > 1 ? " is-action" : ""}`}
              aria-label={
                key === "back" ? "Apagar" : key === "clear" ? "Limpar" : key
              }
              disabled={busy || (key.length > 1 && pin === "")}
              onClick={() => press(key)}
            >
              {key === "back" ? "⌫" : key === "clear" ? "C" : key}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="btn primary pin-submit"
          disabled={busy || pin === ""}
        >
          {busy ? "A verificar…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
