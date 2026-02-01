"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function TOTPVerify() {
  const { update } = useSession();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    if (!code || code.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          isSetup: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }

      // Update session to mark TOTP as verified for this session
      await update({ totpVerified: true });

      // Refresh to proceed to next step
      router.refresh();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";
      setError(errorMessage);
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-md">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Two-Factor Authentication
        </h2>
        <p className="text-sm text-zinc-400">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <form onSubmit={handleVerify} className="w-full space-y-4">
        <div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 text-white font-mono text-center text-2xl tracking-widest placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            autoComplete="one-time-code"
            autoFocus
          />
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={code.length !== 6 || isVerifying}
          className="w-full px-6 py-3 bg-white text-black font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </button>
      </form>

      <p className="text-xs text-zinc-500 text-center">
        Open your authenticator app to view your verification code
      </p>
    </div>
  );
}
