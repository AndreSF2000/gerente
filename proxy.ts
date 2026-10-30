import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authEnabled, hasValidCookie } from "@/lib/auth";

export function proxy(request: NextRequest) {
  // Sem PINs definidos só o desenvolvimento local fica aberto; em produção fecha.
  if (!authEnabled() && process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }
  if (hasValidCookie(request.cookies.get(AUTH_COOKIE)?.value)) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { code: "unauthorized", message: "É preciso o PIN de acesso." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.redirect(new URL("/entrar", request.url));
}

export const config = {
  // A página de entrada, o login e os ícones ficam de fora.
  matcher: [
    "/((?!entrar|api/login|_next/|icon|apple-touch-icon|manifest|favicon).*)",
  ],
};
