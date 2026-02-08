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
      <div className="text-muted-foreground text-sm">
        Loading wallet connection...
      </div>
    ),
  }
);

const TOTPSetup = dynamic(
  () => import("@/components/TOTPSetup").then((mod) => mod.TOTPSetup),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground text-sm">
        Loading authenticator setup...
      </div>
    ),
  }
);

const TOTPVerify = dynamic(
  () => import("@/components/TOTPVerify").then((mod) => mod.TOTPVerify),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground text-sm">
        Loading verification...
      </div>
    ),
  }
);

// Minimal step label
function StepLabel({ currentStep }: { currentStep: number }) {
  const labels: Record<number, { tag: string; heading: string; sub: string }> =
    {
      1: {
        tag: "01 — Authenticate",
        heading: "Sign in",
        sub: "Verify your identity to continue",
      },
      2: {
        tag: "02 — Two-Factor",
        heading: "Verify",
        sub: "Confirm with your authenticator",
      },
      3: {
        tag: "03 — Wallet",
        heading: "Connect",
        sub: "Link your wallet to proceed",
      },
      4: {
        tag: "04 — Complete",
        heading: "Done",
        sub: "Redirecting you now",
      },
    };

  const step = labels[currentStep] || labels[1];

  return (
    <div className="space-y-4">
      <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
        {step.tag}
      </span>
      <h1 className="text-5xl sm:text-6xl font-heading font-bold text-foreground leading-none tracking-tight">
        {step.heading}
      </h1>
      <p className="text-muted-foreground text-sm max-w-xs">{step.sub}</p>
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

// Animated grid decoration
function GridDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Horizontal lines */}
      <div className="absolute top-1/4 left-0 right-0 h-px bg-border/40" />
      <div className="absolute top-2/4 left-0 right-0 h-px bg-border/20" />
      <div className="absolute top-3/4 left-0 right-0 h-px bg-border/40" />
      {/* Vertical lines */}
      <div className="absolute top-0 bottom-0 left-1/4 w-px bg-border/20" />
      <div className="absolute top-0 bottom-0 left-2/4 w-px bg-border/10" />
      <div className="absolute top-0 bottom-0 left-3/4 w-px bg-border/20" />
      {/* Accent dot */}
      <div className="absolute top-1/4 left-3/4 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 animate-pulse" />
      <div className="absolute top-3/4 left-1/4 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/20 animate-pulse [animation-delay:1s]" />
    </div>
  );
}

// Progress bar at top
function ProgressBar({ step }: { step: number }) {
  const progress = ((step - 1) / 3) * 100;
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] bg-border/30 z-50">
      <div
        className="h-full bg-foreground transition-all duration-700 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <img src="/logo.svg" alt="Tachyon" width={48} height={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative">
      <ProgressBar step={currentStep} />
      <GridDecoration />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Tachyon" width={28} height={28} />
          <span className="font-heading font-semibold text-lg text-foreground">
            tachyon
          </span>
          <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
            admin
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-8">
        <div className="w-full max-w-lg">
          {/* Step heading area */}
          <div className="mb-10">
            <StepLabel currentStep={currentStep} />
          </div>

          {/* Step 1: Google Login */}
          {!session?.user && (
            <div className="space-y-8">
              <button
                onClick={() =>
                  signIn("google", undefined, { prompt: "select_account" })
                }
                className="group w-full flex items-center justify-between px-6 py-4 border border-border cursor-pointer bg-card hover:bg-accent transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-secondary flex items-center justify-center">
                    <GoogleIcon />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-medium text-foreground">
                      Continue with Google
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Use your organization account
                    </span>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>

              <p className="text-[11px] font-mono text-muted-foreground tracking-wide text-center">
                Restricted to authorized administrators
              </p>
            </div>
          )}

          {/* Step 2: TOTP */}
          {session?.user && !session.user.totpVerified && (
            <div className="space-y-6">
              {checkingTOTP || hasTOTP === null ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    Checking authentication status...
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <h2 className="text-lg font-heading font-semibold text-foreground">
                      {hasTOTP ? "Enter Code" : "Setup Required"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {hasTOTP
                        ? "Open your authenticator app and enter the 6-digit code"
                        : "Configure two-factor authentication to secure your account"}
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary">
                      <div className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                      <span className="text-xs font-mono text-secondary-foreground">
                        {session.user.email}
                      </span>
                    </div>
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
                <div className="space-y-3">
                  <h2 className="text-lg font-heading font-semibold text-foreground">
                    Link Wallet
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Connect and sign to verify wallet ownership
                  </p>
                </div>
                <WalletAuth />
              </div>
            )}

          {/* Fully authenticated */}
          {session?.user?.walletConnected && (
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-chart-2"
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
                <div className="absolute inset-0 rounded-full bg-chart-2/5 animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-foreground font-medium">
                  Authentication complete
                </p>
                <p className="text-muted-foreground text-sm">
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between p-6 sm:p-8">
        <span className="text-[11px] font-mono text-muted-foreground/50 tracking-wide">
          Multi-factor protected
        </span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                currentStep >= s
                  ? "bg-foreground"
                  : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
