import { SiweMessage } from "siwe";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import crypto from "crypto";

// Helper to create a cookie name from email
function getWalletCookieName(email: string): string {
  const hash = crypto.createHash("sha256").update(email).digest("hex").slice(0, 16);
  return `wallet-link-${hash}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    // Must be logged in with Google first
    if (!session?.user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { message, signature } = await req.json();
    const siweMessage = new SiweMessage(message);
    const cookieStore = await cookies();

    // Verify nonce matches
    const storedNonce = cookieStore.get("siwe-nonce")?.value;

    if (!storedNonce || siweMessage.nonce !== storedNonce) {
      return Response.json({ error: "Invalid nonce" }, { status: 422 });
    }

    // Verify signature
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return Response.json({ error: "Invalid signature" }, { status: 422 });
    }

    // Check wallet-email link
    const walletCookieName = getWalletCookieName(session.user.email);
    const linkedWallet = cookieStore.get(walletCookieName)?.value;
    const connectedWallet = siweMessage.address.toLowerCase();

    if (linkedWallet) {
      // Email already has a linked wallet - verify it matches
      if (linkedWallet.toLowerCase() !== connectedWallet) {
        return Response.json(
          {
            error: "Wallet mismatch",
            message: "This email is linked to a different wallet",
            linkedWallet: linkedWallet,
            connectedWallet: connectedWallet,
          },
          { status: 403 }
        );
      }
    } else {
      // First time - link wallet to email
      cookieStore.set(walletCookieName, connectedWallet, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
        path: "/",
      });
    }

    // Clear nonce cookie
    cookieStore.delete("siwe-nonce");

    return Response.json({
      success: true,
      address: siweMessage.address,
      isNewLink: !linkedWallet,
    });
  } catch (error) {
    console.error("SIWE verification error:", error);
    return Response.json({ error: "Verification failed" }, { status: 500 });
  }
}
