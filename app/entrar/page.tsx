"use client";

import { useCallback, useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { FaceIdIcon, PizzaIcon } from "@/components/icons";
import {
  FACEID_KEY,
  UNLOCK_KEY,
  faceIdAvailable,
  readKey,
  writeKey,
} from "@/lib/unlock";

const PIN_LENGTH = 6;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function unlock() {
  writeKey("session", UNLOCK_KEY, "1");
  window.location.replace("/");
}

export default function EntrarPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [faceId, setFaceId] = useState(false);

  useEffect(() => {
    if (!readKey("local", FACEID_KEY)) return;
    void faceIdAvailable().then(setFaceId);
  }, []);

  const submit = useCallback(async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: code }),
      });
      if (response.ok) return unlock();
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(payload?.message ?? "Não foi possível entrar.");
    } catch {
      setError("Sem ligação. Tenta outra vez.");
    }
    setPin("");
    setBusy(false);
  }, []);

  // Entra sozinho ao chegar ao último dígito.
  const type = (value: string) => {
    if (busy) return;
    const next = value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setError(null);
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  const enterWithFaceId = async () => {
    setBusy(true);
    setError(null);
    try {
      const options = await fetch("/api/passkey/login", { cache: "no-store" });
      if (!options.ok) throw new Error("opções");
      const response = await startAuthentication({
        optionsJSON: await options.json(),
      });
      const result = await fetch("/api/passkey/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (result.ok) return unlock();
      const payload = (await result.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(payload?.message ?? "Face ID não reconhecido.");
    } catch {
      setError("Face ID cancelado. Usa o PIN.");
    }
    setBusy(false);
  };

  return (
    <main className="pin-page">
      <div className="card pin-card">
        <span className="brand-mark" aria-hidden="true">
          <PizzaIcon className="brand-icon" />
        </span>
        <h1 className="brand-name">Mr Pizza</h1>
        <p className="pin-sub">
          {busy ? "A verificar…" : "Escreve o PIN para abrir o horário."}
        </p>

        {/* Computador: campo normal. Telemóvel: teclado numérico (ver CSS). */}
        <label className="sr-only" htmlFor="pin">
          PIN de acesso de {PIN_LENGTH} dígitos
        </label>
        <input
          id="pin"
          className="input pin-input"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          placeholder={`PIN de ${PIN_LENGTH} dígitos`}
          value={pin}
          maxLength={PIN_LENGTH}
          disabled={busy}
          onChange={(event) => type(event.target.value)}
        />

        <div
          className={`pin-dots${error ? " is-error" : ""}`}
          role="status"
          aria-label={`${pin.length} de ${PIN_LENGTH} números escritos`}
        >
          {pin.length === 0 ? (
            <span className="pin-placeholder">
              PIN de acesso · {PIN_LENGTH} dígitos
            </span>
          ) : (
            Array.from({ length: PIN_LENGTH }, (_, index) => (
              <i key={index} className={index < pin.length ? "on" : ""} />
            ))
          )}
        </div>

        {error && (
          <p className="pin-error" role="alert">
            {error}
          </p>
        )}

        <div className="pin-pad">
          {DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              className="pin-key"
              disabled={busy}
              onClick={() => type(pin + digit)}
            >
              {digit}
            </button>
          ))}
          {faceId ? (
            <button
              type="button"
              className="pin-key is-action is-faceid"
              aria-label="Entrar com Face ID"
              disabled={busy}
              onClick={() => void enterWithFaceId()}
            >
              <FaceIdIcon className="pin-faceid-icon" />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            className="pin-key"
            disabled={busy}
            onClick={() => type(pin + "0")}
          >
            0
          </button>
          <button
            type="button"
            className="pin-key is-action"
            aria-label="Apagar"
            disabled={busy || pin === ""}
            onClick={() => type(pin.slice(0, -1))}
          >
            ⌫
          </button>
        </div>
      </div>
    </main>
  );
}
