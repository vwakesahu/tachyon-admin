import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // Double-check protection (middleware handles this too)
  if (!session?.user?.walletConnected) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-heading font-bold text-white">
          Welcome to Tachyon Protocol
        </h1>
        <p className="text-zinc-400">Email: {session.user.email}</p>
        <p className="text-zinc-400 font-mono text-sm">
          Wallet: {session.user.walletAddress}
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="px-6 py-3 border border-zinc-700 text-white font-medium rounded-none hover:bg-zinc-900 transition-colors"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}
