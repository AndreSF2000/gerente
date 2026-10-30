import { NextResponse, type NextRequest } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import {
  CHALLENGE_COOKIE,
  readChallenge,
  relyingParty,
  signChallenge,
} from "@/lib/auth";
import { readPasskeys, writePasskeys } from "@/lib/storage";

// Só chega aqui quem já entrou com o PIN (o proxy protege esta rota).
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };
const MAX_PASSKEYS = 20;

export async function GET(request: NextRequest) {
  const { rpID } = relyingParty(request);
  const passkeys = await readPasskeys();
  const options = await generateRegistrationOptions({
    rpName: "Mr Pizza",
    rpID,
    userName: "Mr Pizza",
    attestationType: "none",
    excludeCredentials: passkeys.map(({ id, transports }) => ({ id, transports })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  const response = NextResponse.json(options, { headers: NO_STORE_HEADERS });
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

  const { rpID, origin } = relyingParty(request);
  const body = (await request.json().catch(() => null)) as {
    response?: unknown;
    device?: unknown;
  } | null;

  try {
    const verification = await verifyRegistrationResponse({
      response: body?.response as Parameters<
        typeof verifyRegistrationResponse
      >[0]["response"],
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verification.verified) throw new Error("não verificado");

    const { credential } = verification.registrationInfo;
    const passkeys = (await readPasskeys()).filter(
      (item) => item.id !== credential.id,
    );
    passkeys.push({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports,
      device:
        typeof body?.device === "string" ? body.device.slice(0, 60) : "Telemóvel",
      createdAt: new Date().toISOString(),
    });
    await writePasskeys(passkeys.slice(-MAX_PASSKEYS));

    const response = NextResponse.json(
      { ok: true, id: credential.id },
      { headers: NO_STORE_HEADERS },
    );
    response.cookies.delete({ name: CHALLENGE_COOKIE, path: "/api/passkey" });
    return response;
  } catch (error) {
    console.error("Falha ao registar o Face ID:", error);
    return NextResponse.json(
      { message: "Não foi possível ativar o Face ID." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}

/** Remove o Face ID de um dispositivo. */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { message: "Falta o identificador." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  const passkeys = await readPasskeys();
  await writePasskeys(passkeys.filter((item) => item.id !== id));
  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
