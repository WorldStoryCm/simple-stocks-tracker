import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db/drizzle";
import * as schema from "../db/schema";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

const authBaseURL = process.env.BETTER_AUTH_URL;
const trustedOrigins = [
  authBaseURL,
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_AUTH_URL,
  process.env.NODE_ENV !== "production" ? "http://localhost:3001" : undefined,
  process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3001" : undefined,
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  baseURL: authBaseURL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  session: {
    expiresIn: THIRTY_DAYS_IN_SECONDS,
    updateAge: ONE_DAY_IN_SECONDS,
  },
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
