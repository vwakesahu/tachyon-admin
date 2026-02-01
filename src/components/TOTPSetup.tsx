"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    } catch (err) {
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

      // Update session to mark TOTP as enabled and verified
      await update({ totpEnabled: true, totpVerified: true });

      // Refresh to proceed to next step
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
      <div className="text-zinc-400">
        Generating authenticator setup...
      </div>
    );
  }

  if (!setupData) {
    return (
      <div className="text-red-500">
        {error || "Failed to load setup. Please refresh."}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-md">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Set Up Authenticator
        </h2>
        <p className="text-sm text-zinc-400">
          Scan the QR code with your authenticator app (Google Authenticator,
          Authy, 1Password, etc.)
        </p>
      </div>

      {/* QR Code */}
      <div className="p-4 bg-zinc-900 border border-zinc-800">
        <Image
          src={setupData.qrCode}
          alt="TOTP QR Code"
          width={256}
          height={256}
          className="block"
        />
      </div>

      {/* Manual entry option */}
      <button
        type="button"
        onClick={() => setShowManual(!showManual)}
        className="text-sm text-zinc-500 hover:text-zinc-300 underline"
      >
        {showManual ? "Hide manual entry code" : "Can't scan? Enter manually"}
      </button>

      {showManual && (
        <div className="w-full p-4 bg-zinc-900 border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">
            Enter this code manually in your authenticator app:
          </p>
          <code className="text-sm font-mono text-green-400 break-all select-all">
            {setupData.secret}
          </code>
        </div>
      )}

      {/* Verification form */}
      <form onSubmit={handleVerify} className="w-full space-y-4">
        <div>
          <label
            htmlFor="totp-code"
            className="block text-sm text-zinc-400 mb-2"
          >
            Enter the 6-digit code from your authenticator
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
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 text-white font-mono text-center text-2xl tracking-widest placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            autoComplete="one-time-code"
          />
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={code.length !== 6 || isVerifying}
          className="w-full px-6 py-3 bg-white text-black font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? "Verifying..." : "Verify & Continue"}
        </button>
      </form>
    </div>
  );
}
