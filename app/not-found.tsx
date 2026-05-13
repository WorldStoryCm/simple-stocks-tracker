import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Not found",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-text-primary px-6">
      <div className="text-center max-w-md">
        <div className="text-xs uppercase tracking-wider text-text-tertiary font-medium">404</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Not found.</h1>
        <p className="mt-3 text-text-secondary">
          This page doesn&apos;t exist, or it&apos;s behind a login.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] shadow-[var(--shadow-glow-brand)] transition-transform hover:scale-[1.02]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
