"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
/* eslint-disable @next/next/no-img-element */

interface SetupData {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export function TOTPSetup() {
  const { update } = useSession();
  const router = useRouter();

  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    fetchSetupData();
  }, []);

  async function fetchSetupData() {
    try {
      const res = await fetch("/api/totp/setup");
      if (!res.ok) throw new Error("Failed to generate TOTP");

      const data = await res.json();
      setSetupData(data);
    } catch {
      setError("Failed to generate authenticator setup");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    if (!setupData || !code) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          secret: setupData.secret,
          isSetup: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }

      await update({ totpEnabled: true, totpVerified: true });
      router.refresh();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Generating QR code...</p>
      </div>
    );
  }

  if (!setupData) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500 text-sm">
          {error || "Failed to load setup. Please refresh."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* QR Code */}
      <div className="bg-white p-3">
        <img
          src={setupData.qrCode}
          alt="TOTP QR Code"
          width={180}
          height={180}
          className="block"
        />
      </div>

      <p className="text-zinc-500 text-xs text-center">
        Scan with Google Authenticator, Authy, or 1Password
      </p>

      {/* Manual entry option */}
      <button
        type="button"
        onClick={() => setShowManual(!showManual)}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {showManual ? "Hide code" : "Can't scan? Show code"}
      </button>

      {showManual && (
        <div className="w-full p-3 bg-zinc-900 border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Manual entry code:</p>
          <code className="text-xs font-mono text-green-400 break-all select-all">
            {setupData.secret}
          </code>
        </div>
      )}

      {/* Verification form */}
      <form onSubmit={handleVerify} className="w-full space-y-4">
        <div>
          <label
            htmlFor="totp-code"
            className="block text-xs text-zinc-500 mb-2"
          >
            Enter 6-digit code to verify
          </label>
          <input
            id="totp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white font-mono text-center text-xl tracking-[0.5em] placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
            autoComplete="one-time-code"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={code.length !== 6 || isVerifying}
          className="w-full px-6 py-3 bg-white text-black font-medium hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & Continue"
          )}
        </button>
      </form>
    </div>
  );
}
