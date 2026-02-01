"use client";

import { signIn, useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
/* eslint-disable @next/next/no-img-element */

// Dynamically import components to prevent SSR issues
const WalletAuth = dynamic(
  () => import("@/components/WalletAuth").then((mod) => mod.WalletAuth),
  {
    ssr: false,
    loading: () => (
      <div className="text-zinc-500 text-sm">Loading wallet connection...</div>
    ),
  }
);

const TOTPSetup = dynamic(
  () => import("@/components/TOTPSetup").then((mod) => mod.TOTPSetup),
  {
    ssr: false,
    loading: () => (
      <div className="text-zinc-500 text-sm">Loading authenticator setup...</div>
    ),
  }
);

const TOTPVerify = dynamic(
  () => import("@/components/TOTPVerify").then((mod) => mod.TOTPVerify),
  {
    ssr: false,
    loading: () => (
      <div className="text-zinc-500 text-sm">Loading verification...</div>
    ),
  }
);

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Sign In" },
    { num: 2, label: "2FA" },
    { num: 3, label: "Wallet" },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono transition-all ${
              currentStep >= step.num
                ? "bg-white text-black"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {currentStep > step.num ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              step.num
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-[2px] mx-1 transition-all ${
                currentStep > step.num ? "bg-white" : "bg-zinc-800"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Google icon component
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [hasTOTP, setHasTOTP] = useState<boolean | null>(null);
  const [checkingTOTP, setCheckingTOTP] = useState(false);

  // Determine current step
  let currentStep = 1;
  if (session?.user) {
    currentStep = session.user.totpVerified ? 3 : 2;
    if (session.user.walletConnected) currentStep = 4;
  }

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
        <div className="animate-pulse">
          <img src="/logo.svg" alt="Tachyon" width={48} height={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Tachyon" width={32} height={32} />
          <span className="text-white font-heading font-semibold text-lg">
            tachyon
          </span>
          <span className="text-zinc-600 font-mono text-sm">admin</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-zinc-950 border border-zinc-800 p-8">
            {/* Step indicator */}
            <div className="flex justify-center mb-8">
              <StepIndicator currentStep={currentStep} />
            </div>

            {/* Step 1: Google Login */}
            {!session?.user && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-heading font-semibold text-white">
                    Welcome back
                  </h1>
                  <p className="text-zinc-500 text-sm">
                    Sign in to access the admin dashboard
                  </p>
                </div>

                <button
                  onClick={() =>
                    signIn("google", undefined, { prompt: "select_account" })
                  }
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-black font-medium hover:bg-zinc-100 transition-colors"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <p className="text-xs text-zinc-600 text-center">
                  Only authorized administrators can access this dashboard
                </p>
              </div>
            )}

            {/* Step 2: TOTP */}
            {session?.user && !session.user.totpVerified && (
              <div className="space-y-6">
                {checkingTOTP || hasTOTP === null ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                    <p className="text-zinc-500 text-sm">
                      Checking authentication status...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <h1 className="text-2xl font-heading font-semibold text-white">
                        {hasTOTP ? "Verify Identity" : "Set Up 2FA"}
                      </h1>
                      <p className="text-zinc-500 text-sm">
                        {hasTOTP
                          ? "Enter your authenticator code"
                          : "Secure your account with two-factor authentication"}
                      </p>
                      <p className="text-zinc-600 text-xs font-mono">
                        {session.user.email}
                      </p>
                    </div>
                    {hasTOTP ? <TOTPVerify /> : <TOTPSetup />}
                  </>
                )}
              </div>
            )}

            {/* Step 3: Wallet */}
            {session?.user &&
              session.user.totpVerified &&
              !session.user.walletConnected && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl font-heading font-semibold text-white">
                      Connect Wallet
                    </h1>
                    <p className="text-zinc-500 text-sm">
                      Link your wallet to verify ownership
                    </p>
                  </div>
                  <WalletAuth />
                </div>
              )}

            {/* Fully authenticated */}
            {session?.user?.walletConnected && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-zinc-400">Authentication complete</p>
                <p className="text-zinc-600 text-sm">Redirecting to dashboard...</p>
              </div>
            )}
          </div>

          {/* Footer text */}
          <p className="text-center text-zinc-700 text-xs mt-6">
            Protected by multi-factor authentication
          </p>
        </div>
      </main>
    </div>
  );
}
