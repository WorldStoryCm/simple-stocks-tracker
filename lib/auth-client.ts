import { createAuthClient } from "better-auth/react";

const authBaseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_AUTH_URL;

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});

export const { signIn, signOut, useSession, updateUser } = authClient;
