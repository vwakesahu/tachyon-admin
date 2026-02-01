import { SiweMessage } from "siwe";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserByEmail, getUserByWallet, createOrUpdateUser } from "@/lib/firebase";

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

    const connectedWallet = siweMessage.address.toLowerCase();

    // Check if email already has a linked wallet
    const user = await getUserByEmail(session.user.email);

    if (user?.walletAddress) {
      // Email already has a linked wallet - verify it matches
      if (user.walletAddress !== connectedWallet) {
        return Response.json(
          {
            error: "Wallet mismatch",
            message: "This email is linked to a different wallet",
            linkedWallet: user.walletAddress,
            connectedWallet: connectedWallet,
          },
          { status: 403 }
        );
      }
    } else {
      // Check if wallet is already linked to another email
      const walletUser = await getUserByWallet(connectedWallet);
      if (walletUser && walletUser.email !== session.user.email) {
        return Response.json(
          {
            error: "Wallet already linked",
            message: "This wallet is already linked to another account",
          },
          { status: 403 }
        );
      }

      // First time - link wallet to email
      await createOrUpdateUser(session.user.email, {
        walletAddress: connectedWallet,
      });
    }

    // Clear nonce cookie
    cookieStore.delete("siwe-nonce");

    return Response.json({
      success: true,
      address: siweMessage.address,
      isNewLink: !user?.walletAddress,
    });
  } catch (error) {
    console.error("SIWE verification error:", error);
    return Response.json({ error: "Verification failed" }, { status: 500 });
  }
}
