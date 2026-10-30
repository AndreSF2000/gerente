import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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
