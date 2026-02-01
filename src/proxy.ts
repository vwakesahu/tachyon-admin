import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api");
  const isPublicRoute = isLoginPage || isApiRoute;

  // Get the session
  const session = await auth();

  // Not logged in with Google → redirect to login
  if (!session?.user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in but TOTP not verified → redirect to login
  if (session?.user && !session.user.totpVerified && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // TOTP verified but wallet not connected → redirect to login
  if (
    session?.user &&
    session.user.totpVerified &&
    !session.user.walletConnected &&
    !isPublicRoute
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fully authenticated but trying to access login page
  if (session?.user?.walletConnected && session.user.totpVerified && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
