import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me-1234567890abcd");

async function hasValidSession(req: NextRequest, cookieName: string, role: string) {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === role;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!(await hasValidSession(req, "km_admin", "admin"))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (pathname.startsWith("/partner") && pathname !== "/partner/login") {
    if (!(await hasValidSession(req, "km_partner", "partner"))) {
      return NextResponse.redirect(new URL("/partner/login", req.url));
    }
  }

  if (["/checkout", "/pesanan", "/akun"].some((p) => pathname.startsWith(p))) {
    if (!(await hasValidSession(req, "km_user", "user"))) {
      const url = new URL("/masuk", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/partner/:path*", "/checkout/:path*", "/checkout", "/pesanan/:path*", "/pesanan", "/akun/:path*", "/akun"],
};
