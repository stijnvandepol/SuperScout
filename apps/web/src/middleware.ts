import { NextResponse, type NextRequest } from "next/server";

/**
 * Guard for /beheer.
 *
 * Off unless ADMIN_TOKEN is set — then the page answers 404, as if it did not
 * exist, rather than advertising a login prompt to every scanner. With a token
 * it asks for HTTP Basic auth (any user name, the token as password). Basic
 * auth is only acceptable over TLS, which Caddy/Cloudflare provide in front.
 */
export function middleware(request: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token.length < 16) {
    return new NextResponse("Not found", { status: 404 });
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    let password = "";
    try {
      password = atob(encoded).split(":").slice(1).join(":");
    } catch {
      // Malformed header — treated as no credentials.
    }
    if (constantTimeEqual(password, token)) {
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  }

  return new NextResponse("Authenticatie vereist", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SuperScout beheer", charset="UTF-8"' },
  });
}

/** Comparison whose duration does not depend on where the strings differ. */
function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export const config = { matcher: ["/beheer", "/beheer/:path*"] };
