import { NextResponse, type NextRequest } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  authEnabled,
  CHALLENGE_COOKIE,
  readChallenge,
  relyingParty,
  setAuthCookie,
  signChallenge,
} from "@/lib/auth";
import { readPasskeys, writePasskeys } from "@/lib/storage";

// Rota pública: entrar com Face ID em vez do PIN.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json(
      { message: "O PIN ainda não foi configurado no servidor (APP_PINS)." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const { rpID } = relyingParty(request);
  const passkeys = await readPasskeys();
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map(({ id, transports }) => ({ id, transports })),
    userVerification: "required",
  });

  const response = NextResponse.json(
    { ...options, hints: ["client-device"] },
    { headers: NO_STORE_HEADERS },
  );
  const challenge = signChallenge(options.challenge);
  response.cookies.set(CHALLENGE_COOKIE, challenge.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/passkey",
    maxAge: challenge.maxAge,
  });
  return response;
}

export async function POST(request: NextRequest) {
  const expectedChallenge = readChallenge(
    request.cookies.get(CHALLENGE_COOKIE)?.value,
  );
  if (!expectedChallenge) {
    return NextResponse.json(
      { message: "O pedido expirou. Tenta outra vez." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    response?: { id?: unknown };
  } | null;
  const passkeys = await readPasskeys();
  const stored = passkeys.find((item) => item.id === body?.response?.id);
  if (!stored) {
    return NextResponse.json(
      { message: "Este Face ID já não está ativo. Entra com o PIN." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { rpID, origin } = relyingParty(request);
  try {
    const verification = await verifyAuthenticationResponse({
      response: body?.response as Parameters<
        typeof verifyAuthenticationResponse
      >[0]["response"],
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
        counter: stored.counter,
        transports: stored.transports,
      },
    });
    if (!verification.verified) throw new Error("não verificado");

    stored.counter = verification.authenticationInfo.newCounter;
    await writePasskeys(passkeys);
  } catch (error) {
    console.error("Falha ao entrar com Face ID:", error);
    return NextResponse.json(
      { message: "Face ID não reconhecido. Entra com o PIN." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  setAuthCookie(response);
  response.cookies.delete({ name: CHALLENGE_COOKIE, path: "/api/passkey" });
  return response;
}
