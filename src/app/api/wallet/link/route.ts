import { auth } from "@/lib/auth";
import { getUserByEmail, getUserByWallet, createOrUpdateUser } from "@/lib/firebase";

// Check if email has a linked wallet
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);

    return Response.json({
      hasLinkedWallet: !!user?.walletAddress,
      linkedWallet: user?.walletAddress || null,
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

    const normalizedWallet = walletAddress.toLowerCase();

    // Check if email already has a linked wallet
    const existingUser = await getUserByEmail(session.user.email);
    if (existingUser?.walletAddress && existingUser.walletAddress !== normalizedWallet) {
      return Response.json(
        {
          error: "Email already linked to different wallet",
          linkedWallet: existingUser.walletAddress,
        },
        { status: 409 }
      );
    }

    // Check if wallet is already linked to another email
    const walletUser = await getUserByWallet(normalizedWallet);
    if (walletUser && walletUser.email !== session.user.email) {
      return Response.json(
        { error: "Wallet already linked to another account" },
        { status: 409 }
      );
    }

    // Link wallet to email
    await createOrUpdateUser(session.user.email, {
      walletAddress: normalizedWallet,
    });

    return Response.json({
      success: true,
      linkedWallet: normalizedWallet,
    });
  } catch (error) {
    console.error("Wallet link error:", error);
    return Response.json({ error: "Link failed" }, { status: 500 });
  }
}
