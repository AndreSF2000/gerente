import { NextResponse } from "next/server";
import { sanitizeState } from "@/lib/sanitize";
import {
  readState,
  StorageUnavailableError,
  writeState,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024;
const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    const result = await readState();
    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      return NextResponse.json(
        { code: "no-database", message: error.message },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    console.error("Falha ao ler o horário:", error);
    return NextResponse.json(
      { code: "server-error", message: "Não foi possível carregar o horário." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function PUT(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { code: "too-large", message: "Os dados enviados são demasiado grandes." },
      { status: 413, headers: NO_STORE_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid-json", message: "Pedido inválido." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const state = sanitizeState(body);
  if (!state) {
    return NextResponse.json(
      { code: "invalid-state", message: "Os dados do horário não são válidos." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const saved = await writeState(state);
    return NextResponse.json(
      { ok: true, mode: saved.mode, updatedAt: saved.updatedAt },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      return NextResponse.json(
        { code: "no-database", message: error.message },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    console.error("Falha ao guardar o horário:", error);
    return NextResponse.json(
      { code: "server-error", message: "Não foi possível guardar o horário." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
