import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "",
  plugins: [genericOAuthClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
