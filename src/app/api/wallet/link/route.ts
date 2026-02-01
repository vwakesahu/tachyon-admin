import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

// Helper to create a cookie name from email
function getWalletCookieName(email: string): string {
  const hash = crypto.createHash("sha256").update(email).digest("hex").slice(0, 16);
  return `wallet-link-${hash}`;
}

// Check if email has a linked wallet
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const cookieName = getWalletCookieName(session.user.email);
    const linkedWallet = cookieStore.get(cookieName)?.value;

    return Response.json({
      hasLinkedWallet: !!linkedWallet,
      linkedWallet: linkedWallet || null,
    });
  } catch (error) {
    console.error("Wallet link check error:", error);
    return Response.json({ error: "Check failed" }, { status: 500 });
  }
}

// Link a wallet to the current user's email
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return Response.json({ error: "Wallet address required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cookieName = getWalletCookieName(session.user.email);

    // Check if already linked to a different wallet
    const existingWallet = cookieStore.get(cookieName)?.value;
    if (existingWallet && existingWallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return Response.json(
        {
          error: "Email already linked to different wallet",
          linkedWallet: existingWallet,
        },
        { status: 409 }
      );
    }

    // Store the wallet-email link
    cookieStore.set(cookieName, walletAddress.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
      path: "/",
    });

    return Response.json({
      success: true,
      linkedWallet: walletAddress.toLowerCase(),
    });
  } catch (error) {
    console.error("Wallet link error:", error);
    return Response.json({ error: "Link failed" }, { status: 500 });
  }
}
