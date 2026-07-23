"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/button";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const maybeStatus = "status" in error ? error.status : undefined;
  if (typeof maybeStatus === "number") return maybeStatus;
  const maybeStatusCode = "statusCode" in error ? error.statusCode : undefined;
  return typeof maybeStatusCode === "number" ? maybeStatusCode : undefined;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, error, refetch } = useSession();
  const router = useRouter();
  const errorStatus = getErrorStatus(error);
  const shouldRedirectToLogin =
    !isPending && !session && (!error || errorStatus === 401);

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace("/login");
    }
  }, [router, shouldRedirectToLogin]);

  if (isPending || shouldRedirectToLogin) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!session && error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background px-4 text-text-primary">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold">Session check failed</h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Your login may still be valid. Retry before signing in again.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => refetch()}>
              Retry
            </Button>
            <Button className="flex-1" variant="outline" onClick={() => router.replace("/login")}>
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-primary">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 [scrollbar-gutter:stable]">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
