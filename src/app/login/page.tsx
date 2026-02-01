"use client";

import { signIn, useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically import components to prevent SSR issues
const WalletAuth = dynamic(
  () => import("@/components/WalletAuth").then((mod) => mod.WalletAuth),
  {
    ssr: false,
    loading: () => (
      <div className="text-zinc-400">Loading wallet connection...</div>
    ),
  }
);

const TOTPSetup = dynamic(
  () => import("@/components/TOTPSetup").then((mod) => mod.TOTPSetup),
  {
    ssr: false,
    loading: () => (
      <div className="text-zinc-400">Loading authenticator setup...</div>
    ),
  }
);

const TOTPVerify = dynamic(
  () => import("@/components/TOTPVerify").then((mod) => mod.TOTPVerify),
  {
    ssr: false,
    loading: () => (
      <div className="text-zinc-400">Loading verification...</div>
    ),
  }
);

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [hasTOTP, setHasTOTP] = useState<boolean | null>(null);
  const [checkingTOTP, setCheckingTOTP] = useState(false);

  // Check if user has TOTP set up when they're logged in but TOTP not verified
  useEffect(() => {
    if (session?.user && !session.user.totpVerified && hasTOTP === null) {
      checkTOTPStatus();
    }
  }, [session, hasTOTP]);

  async function checkTOTPStatus() {
    setCheckingTOTP(true);
    try {
      const res = await fetch("/api/totp/verify");
      if (res.ok) {
        const data = await res.json();
        setHasTOTP(data.hasTotp);
      }
    } catch {
      setHasTOTP(false);
    } finally {
      setCheckingTOTP(false);
    }
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  // Step 1: Google Login
  if (!session?.user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-heading font-bold text-white">
            Tachyon Protocol
          </h1>
          <p className="text-zinc-400">Step 1 of 3: Sign in with Google</p>
        </div>
        <button
          onClick={() => signIn("google", undefined, { prompt: "select_account" })}
          className="px-6 py-3 bg-white text-black font-medium rounded-none hover:bg-zinc-200 transition-colors"
        >
          Continue with Google
        </button>
      </div>
    );
  }

  // Step 2: TOTP Setup or Verify
  if (!session.user.totpVerified) {
    // Still checking TOTP status
    if (checkingTOTP || hasTOTP === null) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-zinc-400">Checking authentication status...</div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8 p-4">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-heading font-bold text-white">
            Tachyon Protocol
          </h1>
          <p className="text-zinc-400">
            Step 2 of 3: Two-Factor Authentication
          </p>
          <p className="text-sm text-zinc-500">Welcome, {session.user.email}</p>
        </div>

        {hasTOTP ? <TOTPVerify /> : <TOTPSetup />}
      </div>
    );
  }

  // Step 3: Wallet Connection + SIWE
  if (!session.user.walletConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-heading font-bold text-white">
            Tachyon Protocol
          </h1>
          <p className="text-zinc-400">Step 3 of 3: Connect & Verify Wallet</p>
          <p className="text-sm text-zinc-500">
            Connect your wallet and sign to verify ownership.
          </p>
        </div>
        <WalletAuth />
      </div>
    );
  }

  // Fully authenticated (middleware will redirect)
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-zinc-400">Redirecting...</div>
    </div>
  );
}
