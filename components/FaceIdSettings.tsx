"use client";

import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { FACEID_KEY, faceIdAvailable, readKey, writeKey } from "@/lib/unlock";
import { FaceIdIcon } from "./icons";

/** Ativa ou desativa o Face ID neste telemóvel. Não aparece no computador. */
export default function FaceIdSettings() {
  const [supported, setSupported] = useState(false);
  const [enabledId, setEnabledId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEnabledId(readKey("local", FACEID_KEY));
    void faceIdAvailable().then(setSupported);
  }, []);

  if (!supported) return null;

  const enable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const options = await fetch("/api/passkey/register", { cache: "no-store" });
      if (!options.ok) throw new Error("opções");
      const response = await startRegistration({
        optionsJSON: await options.json(),
      });
      const result = await fetch("/api/passkey/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          device: /iPhone/.test(navigator.userAgent) ? "iPhone" : "Telemóvel",
        }),
      });
      const payload = (await result.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;
      if (!result.ok || !payload?.id) {
        throw new Error(payload?.message ?? "Não foi possível ativar o Face ID.");
      }
      writeKey("local", FACEID_KEY, payload.id);
      setEnabledId(payload.id);
      setMessage("Face ID ativado. Da próxima vez podes entrar com ele.");
    } catch (error) {
      setMessage(
        error instanceof Error && error.name !== "NotAllowedError"
          ? error.message
          : "Ativação cancelada.",
      );
    }
    setBusy(false);
  };

  const disable = async () => {
    if (!enabledId) return;
    setBusy(true);
    setMessage(null);
    await fetch(`/api/passkey/register?id=${encodeURIComponent(enabledId)}`, {
      method: "DELETE",
    }).catch(() => null);
    writeKey("local", FACEID_KEY, null);
    setEnabledId(null);
    setMessage("Face ID desativado neste telemóvel.");
    setBusy(false);
  };

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2 className="section-title">Face ID</h2>
          <p className="section-desc">
            Entra com o Face ID em vez do PIN neste telemóvel. O PIN continua a
            funcionar.
          </p>
        </div>
      </div>
      <div className="faceid-row">
        <FaceIdIcon className="faceid-row-icon" />
        <span className="faceid-row-text">
          {enabledId ? "Ativado neste telemóvel" : "Desativado neste telemóvel"}
        </span>
        <button
          type="button"
          className={enabledId ? "btn" : "btn primary"}
          disabled={busy}
          onClick={() => void (enabledId ? disable() : enable())}
        >
          {enabledId ? "Desativar" : "Ativar Face ID"}
        </button>
      </div>
      {message && <p className="inline-note">{message}</p>}
    </section>
  );
}
