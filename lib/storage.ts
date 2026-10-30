import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { defaultState } from "./defaults";
import { sanitizeState } from "./sanitize";
import type { ScheduleState, StorageMode } from "./types";

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const SUPABASE_KEY = (
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  ""
).trim();
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const FILE_PATH = path.join(process.cwd(), ".data", "schedule.json");
const TABLE = "mr_pizza_schedule";
const ROW_ID = 1;
/** Passkeys do Face ID, numa linha à parte da mesma tabela. */
const PASSKEYS_ROW_ID = 2;
const PASSKEYS_FILE = path.join(process.cwd(), ".data", "passkeys.json");

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function toISOStringOrNull(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export type ReadResult = {
  state: ScheduleState;
  mode: Extract<StorageMode, "supabase" | "file">;
  updatedAt: string | null;
};

export async function readState(): Promise<ReadResult> {
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data, updated_at")
      .eq("id", ROW_ID)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase: ${error.message}`);
    }
    if (!data) {
      return { state: defaultState(), mode: "supabase", updatedAt: null };
    }

    let stored: unknown = data.data;
    if (typeof stored === "string") {
      try {
        stored = JSON.parse(stored);
      } catch {
        throw new Error("O JSON guardado no Supabase não é válido.");
      }
    }

    const state = sanitizeState(stored);
    if (!state) {
      throw new Error("Os dados guardados no Supabase não são válidos.");
    }

    return {
      state,
      mode: "supabase",
      updatedAt: toISOStringOrNull(data.updated_at),
    };
  }

  if (IS_PRODUCTION) {
    throw new StorageUnavailableError(
      "SUPABASE_URL e SUPABASE_SECRET_KEY não estão definidos.",
    );
  }

  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const state = sanitizeState(JSON.parse(raw));
    if (!state) throw new Error("O ficheiro local de dados não é válido.");
    const stats = await fs.stat(FILE_PATH);
    return { state, mode: "file", updatedAt: stats.mtime.toISOString() };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { state: defaultState(), mode: "file", updatedAt: null };
  }
}

export async function writeState(
  state: ScheduleState,
): Promise<{ mode: Extract<StorageMode, "supabase" | "file">; updatedAt: string }> {
  if (supabase) {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from(TABLE).upsert(
      { id: ROW_ID, data: state, updated_at: updatedAt },
      { onConflict: "id" },
    );
    if (error) {
      throw new Error(`Supabase: ${error.message}`);
    }
    return { mode: "supabase", updatedAt };
  }

  if (IS_PRODUCTION) {
    throw new StorageUnavailableError(
      "SUPABASE_URL e SUPABASE_SECRET_KEY não estão definidos.",
    );
  }

  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  const temporaryPath = `${FILE_PATH}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(temporaryPath, FILE_PATH);
  return { mode: "file", updatedAt: new Date().toISOString() };
}

export type StoredPasskey = {
  id: string;
  /** Chave pública em base64url. */
  publicKey: string;
  counter: number;
  transports?: string[];
  device: string;
  createdAt: string;
};

export async function readPasskeys(): Promise<StoredPasskey[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .eq("id", PASSKEYS_ROW_ID)
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return Array.isArray(data?.data) ? (data.data as StoredPasskey[]) : [];
  }

  if (IS_PRODUCTION) {
    throw new StorageUnavailableError(
      "SUPABASE_URL e SUPABASE_SECRET_KEY não estão definidos.",
    );
  }

  try {
    const stored: unknown = JSON.parse(await fs.readFile(PASSKEYS_FILE, "utf8"));
    return Array.isArray(stored) ? (stored as StoredPasskey[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}

export async function writePasskeys(passkeys: StoredPasskey[]): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from(TABLE).upsert(
      { id: PASSKEYS_ROW_ID, data: passkeys, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (error) throw new Error(`Supabase: ${error.message}`);
    return;
  }

  if (IS_PRODUCTION) {
    throw new StorageUnavailableError(
      "SUPABASE_URL e SUPABASE_SECRET_KEY não estão definidos.",
    );
  }

  await fs.mkdir(path.dirname(PASSKEYS_FILE), { recursive: true });
  await fs.writeFile(PASSKEYS_FILE, JSON.stringify(passkeys, null, 2), "utf8");
}
