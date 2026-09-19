import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optional gate for a private test site: when SITE_PASSWORD is set, every page asks for it
 * (browser login prompt; any username). Leave SITE_PASSWORD unset to open the site to everyone.
 */
export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD?.trim();
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      // atob gives a byte string; browsers send the credentials as UTF-8, so decode those bytes properly.
      const bytes = Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="hashoval (private test site)"' },
  });
}

export const config = {
  // Static assets, the health check and (later) payment-provider webhooks must stay reachable.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|api/payments).*)"],
};
