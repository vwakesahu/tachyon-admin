import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HomeContent } from "@/components/HomeContent";

export default async function HomePage() {
  const session = await auth();

  // Double-check protection (proxy handles this too)
  if (!session?.user?.walletConnected) {
    redirect("/login");
  }

  return (
    <HomeContent
      email={session.user.email || ""}
      walletAddress={session.user.walletAddress || ""}
    />
  );
}
