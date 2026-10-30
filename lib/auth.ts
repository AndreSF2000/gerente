import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const AUTH_COOKIE = "mrpizza_acesso";
/** Um ano: cada dispositivo só volta a pedir o PIN se os PINs mudarem. */
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365;

/** PINs aceites, separados por vírgulas (ex.: APP_PINS=1234,5678). */
const PINS = (process.env.APP_PINS ?? "")
  .split(",")
  .map((pin) => pin.trim())
  .filter(Boolean);

export function authEnabled(): boolean {
  return PINS.length > 0;
}

const digest = (value: string) => createHash("sha256").update(value).digest();

export function isValidPin(pin: string): boolean {
  const given = digest(pin);
  return PINS.some((valid) => timingSafeEqual(digest(valid), given));
}

/** O cookie guarda uma assinatura e não o PIN; mudar os PINs termina todas as sessões. */
export function authCookieValue(): string {
  return createHmac("sha256", PINS.join(","))
    .update("mr-pizza-acesso")
    .digest("hex");
}

export function hasValidCookie(value: string | undefined): boolean {
  if (!value || !authEnabled()) return false;
  const given = Buffer.from(value);
  const expected = Buffer.from(authCookieValue());
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const CHALLENGE_COOKIE = "mrpizza_desafio";
const CHALLENGE_MAX_AGE = 5 * 60;

/** Desafio do Face ID num cookie assinado, válido 5 minutos. */
export function signChallenge(challenge: string): {
  value: string;
  maxAge: number;
} {
  const expires = Date.now() + CHALLENGE_MAX_AGE * 1000;
  const payload = `${challenge}.${expires}`;
  const signature = createHmac("sha256", PINS.join(","))
    .update(payload)
    .digest("base64url");
  return { value: `${payload}.${signature}`, maxAge: CHALLENGE_MAX_AGE };
}

export function readChallenge(value: string | undefined): string | null {
  const [challenge, expires, signature] = (value ?? "").split(".");
  if (!challenge || !expires || !signature) return null;
  if (Number(expires) < Date.now()) return null;
  const expected = createHmac("sha256", PINS.join(","))
    .update(`${challenge}.${expires}`)
    .digest("base64url");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted)
    ? challenge
    : null;
}

export function setAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, authCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
}

/** Domínio e origem do site, para o Face ID ficar ligado a este endereço. */
export function relyingParty(request: Request): { rpID: string; origin: string } {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}` };
}
