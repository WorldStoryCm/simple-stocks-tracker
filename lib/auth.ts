import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db/drizzle";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      roles: {
        type: "string[]",
        required: false,
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});

/**
 * Server-side session getter that cleans up stale cookies.
 * If the session token in the cookie references a DB row that no longer
 * exists (expired / deleted / wiped), redirect to a Route Handler that
 * can actually delete the cookie (Server Components are read-only).
 */
export async function getServerSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error: unknown) {
    // Re-throw Next.js internal errors (redirect, notFound, etc.)
    if (typeof error === "object" && error !== null && "digest" in error) {
      throw error;
    }
    // Stale session cookie — redirect to route handler that clears it
    redirect("/api/auth/clear-session");
  }
}
