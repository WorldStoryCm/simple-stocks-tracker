"use client";

import { signIn } from "@/lib/auth-client";
import { GoogleButton } from "@/components/GoogleButton";

export default function LoginPage() {
  return (
    <div className="flex flex-col h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full p-8 border rounded-xl bg-card shadow-sm">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-muted-foreground text-sm">Sign in to track your stocks and watchlists.</p>
        <div className="w-full mt-4">
          <GoogleButton handleGoogleSignIn={() => signIn.social({ provider: "google" })} />
        </div>
      </div>
    </div>
  );
}
