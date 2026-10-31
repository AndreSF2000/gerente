/** Desbloqueio no browser: o PIN ou o Face ID é pedido sempre que a app abre. */
export const UNLOCK_KEY = "mrpizza_aberto";
/** Guarda neste dispositivo o identificador do Face ID ativado nas definições. */
export const FACEID_KEY = "mrpizza_faceid";
/** Depois de tanto tempo noutra app, volta a pedir o PIN. */
export const RELOCK_AFTER_MS = 2 * 60 * 1000;

type Area = "local" | "session";

const area = (where: Area) =>
  where === "local" ? window.localStorage : window.sessionStorage;

export function readKey(where: Area, key: string): string | null {
  try {
    return area(where).getItem(key);
  } catch {
    return null;
  }
}

export function writeKey(where: Area, key: string, value: string | null): void {
  try {
    if (value === null) area(where).removeItem(key);
    else area(where).setItem(key, value);
  } catch {
    // Sem armazenamento (navegação privada): o PIN volta a ser pedido.
  }
}

export function isUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    // Sem sessionStorage não dá para lembrar o desbloqueio; não prende a app.
    return true;
  }
}

/**
 * Face ID só no iPhone, no Safari ou na app instalada a partir dele. O Chrome e
 * outros browsers no iPhone guardariam a chave no gestor de palavras-passe deles.
 */
export async function faceIdAvailable(): Promise<boolean> {
  const agent = navigator.userAgent;
  if (!/iPhone/.test(agent) || /CriOS|FxiOS|EdgiOS|OPiOS/.test(agent)) return false;
  if (!window.PublicKeyCredential) return false;
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(
    () => false,
  );
}
