import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE,
  authCookieValue,
  authEnabled,
  isValidPin,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export async function POST(request: Request) {
  if (!authEnabled()) {
    return NextResponse.json(
      { message: "O PIN ainda não foi configurado no servidor (APP_PINS)." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    pin?: unknown;
  } | null;
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  if (!pin || pin.length > 32) {
    return NextResponse.json(
      { message: "Escreve o PIN." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // Abranda tentativas seguidas para adivinhar o PIN.
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (!isValidPin(pin)) {
    return NextResponse.json(
      { message: "PIN errado." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  response.cookies.set(AUTH_COOKIE, authCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return response;
}
