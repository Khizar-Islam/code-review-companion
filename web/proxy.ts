import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Next.js 16 renamed "middleware" to "proxy" (a breaking file-convention
// change) — next-auth v4's own `next-auth/middleware` export predates that
// rename and doesn't load cleanly under the new convention, so this reads
// the session token directly instead of depending on next-auth's wrapper.
export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/reviews/:path*"],
};
