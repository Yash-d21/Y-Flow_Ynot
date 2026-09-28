import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  if (pathname.startsWith("/staff")) {
    if (!session) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(login);
    }
    if (role !== "ADMIN" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/client", req.url));
    }
  }

  if (pathname.startsWith("/client")) {
    if (!session) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(login);
    }
    if (role !== "CLIENT") {
      return NextResponse.redirect(new URL("/staff", req.url));
    }
  }

  if (pathname === "/login" && session) {
    const callback = req.nextUrl.searchParams.get("callbackUrl");
    const safe =
      callback && (callback.startsWith("/client") || callback.startsWith("/staff"))
        ? callback
        : role === "CLIENT"
          ? "/client"
          : "/staff";
    // Role mismatch: always send to the right portal home
    if (role === "CLIENT" && safe.startsWith("/staff")) {
      return NextResponse.redirect(new URL("/client", req.url));
    }
    if ((role === "STAFF" || role === "ADMIN") && safe.startsWith("/client")) {
      return NextResponse.redirect(new URL("/staff", req.url));
    }
    return NextResponse.redirect(new URL(safe, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/staff/:path*", "/client/:path*", "/login"],
};
