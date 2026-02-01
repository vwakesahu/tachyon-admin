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

      await update({ totpVerified: true });
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
    <div className="w-full">
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 text-white font-mono text-center text-2xl tracking-[0.5em] placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
            autoComplete="one-time-code"
            autoFocus
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
            "Continue"
          )}
        </button>
      </form>

      <p className="text-xs text-zinc-600 text-center mt-4">
        Open your authenticator app to view your code
      </p>
    </div>
  );
}
