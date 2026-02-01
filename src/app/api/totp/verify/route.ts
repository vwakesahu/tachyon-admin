import { auth } from "@/lib/auth";
import * as OTPAuth from "otpauth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const session = await auth();

    // Must be logged in with Google first
    if (!session?.user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { code, secret, isSetup } = await req.json();

    if (!code || typeof code !== "string") {
      return Response.json({ error: "Code is required" }, { status: 400 });
    }

    // For setup, we need the secret from the request
    // For verification, we get it from the cookie (stored during setup)
    let totpSecret = secret;

    if (!isSetup) {
      // Get secret from httpOnly cookie for returning users
      const cookieStore = await cookies();
      totpSecret = cookieStore.get("totp-secret")?.value;

      if (!totpSecret) {
        return Response.json(
          { error: "TOTP not configured" },
          { status: 400 }
        );
      }
    }

    // Create TOTP instance with the secret
    const totp = new OTPAuth.TOTP({
      issuer: "Tachyon Protocol",
      label: session.user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(totpSecret),
    });

    // Validate the token (allow 1 period window for clock drift)
    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      return Response.json({ error: "Invalid code" }, { status: 422 });
    }

    // If this is initial setup, store the secret in an httpOnly cookie
    // In production, you'd store this in a database
    if (isSetup) {
      const cookieStore = await cookies();
      cookieStore.set("totp-secret", totpSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }

    return Response.json({
      success: true,
      isSetup: !!isSetup,
    });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return Response.json({ error: "Verification failed" }, { status: 500 });
  }
}

// Check if TOTP is already set up for this user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const hasTotp = !!cookieStore.get("totp-secret")?.value;

    return Response.json({ hasTotp });
  } catch (error) {
    console.error("TOTP check error:", error);
    return Response.json({ error: "Check failed" }, { status: 500 });
  }
}
