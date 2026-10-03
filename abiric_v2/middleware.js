import { NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/edge-auth";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // /print/* lives outside /dashboard on purpose (no sidebar chrome in the
  // print/PDF output), so it needs the same auth check applied explicitly.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/print")) {
    const token = req.cookies.get("abiric_token")?.value;
    const user = token ? await verifyTokenEdge(token) : null;

    if (!user) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/dashboard/admin") && !user.is_admin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/print/:path*"],
};
