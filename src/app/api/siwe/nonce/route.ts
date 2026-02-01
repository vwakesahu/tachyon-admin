import { generateSiweNonce } from "viem/siwe";
import { cookies } from "next/headers";

export async function GET() {
  const nonce = generateSiweNonce();

  // Store nonce in httpOnly cookie for verification
  const cookieStore = await cookies();
  cookieStore.set("siwe-nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 5, // 5 minutes
  });

  return Response.json({ nonce });
}
