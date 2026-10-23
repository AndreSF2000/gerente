"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildShareCaption,
  drawScheduleImage,
  exportFileBase,
  exportRangeLabel,
  type ExportRange,
} from "@/lib/export-image";
import type { ScheduleState } from "@/lib/types";
import { DownloadIcon, WhatsAppIcon } from "./icons";

type Props = {
  state: ScheduleState;
  week: string;
  onClose: () => void;
};

export default function WhatsAppExport({ state, week, onClose }: Props) {
  const [range, setRange] = useState<ExportRange>("week");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileName = useMemo(
    () => `${exportFileBase(week, range)}.png`,
    [week, range],
  );
  const caption = useMemo(
    () => buildShareCaption(state, week, range),
    [state, week, range],
  );

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    setFile(null);
    setNote(null);
    setFallbackUrl(null);
    drawScheduleImage(canvas, state, week, range);
    canvas.toBlob((blob) => {
      if (cancelled || !blob) return;
      setFile(
        new File([blob], fileName, {
          type: "image/png",
        }),
      );
    }, "image/png");
    return () => {
      cancelled = true;
    };
  }, [state, week, range, fileName]);

  const download = useCallback(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, [file, fileName]);

  const share = useCallback(async () => {
    if (!file) return;
    setNote(null);
    setFallbackUrl(null);

    const shareData = {
      files: [file],
      title: "Mr Pizza — horário da equipa",
      text: caption,
    };

    let canUseNativeShare = false;
    try {
      canUseNativeShare =
        typeof navigator.share === "function" &&
        Boolean(navigator.canShare?.(shareData));
    } catch {
      canUseNativeShare = false;
    }

    if (canUseNativeShare) {
      try {
        await navigator.share(shareData);
        onClose();
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }

    download();
    const url = `https://wa.me/?text=${encodeURIComponent(caption)}`;
    setFallbackUrl(url);
    setNote("Imagem descarregada. Anexa-a no WhatsApp que abrir.");
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) {
      setNote("Imagem descarregada. Abre o WhatsApp e anexa a imagem.");
    }
  }, [file, caption, download, onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
      >
        <div className="modal-head">
          <div>
            <span className="modal-kicker">Partilhar horário</span>
            <h2 id="export-title">Enviar no WhatsApp</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            ref={closeRef}
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="export-toolbar">
          <div className="range-tabs" role="group" aria-label="Período">
            <button
              type="button"
              className="range-tab"
              aria-pressed={range === "week"}
              onClick={() => setRange("week")}
            >
              Esta semana
            </button>
            <button
              type="button"
              className="range-tab"
              aria-pressed={range === "fourWeeks"}
              onClick={() => setRange("fourWeeks")}
            >
              4 semanas
            </button>
            <button
              type="button"
              className="range-tab"
              aria-pressed={range === "month"}
              onClick={() => setRange("month")}
            >
              Mês completo
            </button>
          </div>
          <span className="range-summary">
            {exportRangeLabel(week, range)}
          </span>
        </div>

        <div className="export-preview">
          <canvas
            ref={canvasRef}
            aria-label={`Pré-visualização do horário de ${exportRangeLabel(
              week,
              range,
            )}`}
          />
        </div>

        <p className="export-hint">
          Dias sem turno aparecem como <strong>Folga</strong>. A imagem mantém
          o estilo do horário de atendimento do Mr Pizza.
        </p>

        {note && (
          <p className="export-note" role="status">
            {note}{" "}
            {fallbackUrl && (
              <a href={fallbackUrl} target="_blank" rel="noreferrer">
                Abrir WhatsApp
              </a>
            )}
          </p>
        )}

        <p className="export-platform-hint">
          No telemóvel abre a partilha do sistema. No computador a imagem é
          descarregada para anexares à conversa.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={download}
            disabled={!file}
          >
            <DownloadIcon className="btn-icon" />
            Descarregar PNG
          </button>
          <button
            type="button"
            className="btn whatsapp"
            onClick={share}
            disabled={!file}
          >
            <WhatsAppIcon className="btn-icon" />
            Partilhar no WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
