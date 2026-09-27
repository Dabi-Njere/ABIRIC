import { NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/edge-auth";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
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
  matcher: ["/dashboard/:path*"],
};
