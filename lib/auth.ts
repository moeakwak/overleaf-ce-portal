import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { db } from "./db";
import { env } from "./env";

export const USER_ROLES = ["user", "super-admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const defaultOidcScopes = ["openid", "profile", "email"];

// Build auth plugins array
function getAuthPlugins() {
  const plugins: (
    | ReturnType<typeof nextCookies>
    | ReturnType<typeof genericOAuth>
  )[] = [nextCookies()];

  if (env.ENABLE_OIDC_LOGIN) {
    if (
      !env.OIDC_CLIENT_ID ||
      !env.OIDC_CLIENT_SECRET ||
      !env.OIDC_DISCOVERY_URL
    ) {
      throw new Error(
        "OIDC login is enabled but provider configuration is incomplete",
      );
    }

    const oidcScopes = env.OIDC_SCOPES
      ? env.OIDC_SCOPES.split(",")
          .map((scope) => scope.trim())
          .filter(Boolean)
      : defaultOidcScopes;

    plugins.push(
      genericOAuth({
        config: [
          {
            providerId: env.OIDC_PROVIDER_ID,
            clientId: env.OIDC_CLIENT_ID,
            clientSecret: env.OIDC_CLIENT_SECRET,
            discoveryUrl: env.OIDC_DISCOVERY_URL,
            scopes: oidcScopes.length > 0 ? oidcScopes : defaultOidcScopes,
            mapProfileToUser: (profile) => {
              const primaryEmail =
                typeof profile.email === "string"
                  ? profile.email
                  : typeof profile.preferred_username === "string" &&
                      profile.preferred_username.includes("@")
                    ? profile.preferred_username
                    : null;

              if (!primaryEmail) {
                throw new Error(
                  "OIDC provider did not return an email address",
                );
              }

              const normalizedEmail = primaryEmail.trim().toLowerCase();
              const displayName =
                typeof profile.name === "string" &&
                profile.name.trim().length > 0
                  ? profile.name
                  : typeof profile.preferred_username === "string" &&
                      profile.preferred_username.trim().length > 0
                    ? profile.preferred_username
                    : normalizedEmail;

              const emailVerified =
                typeof profile.email_verified === "boolean"
                  ? profile.email_verified
                  : typeof profile.emailVerified === "boolean"
                    ? profile.emailVerified
                    : undefined;

              return {
                email: normalizedEmail,
                name: displayName,
                emailVerified,
                image:
                  typeof profile.picture === "string"
                    ? profile.picture
                    : undefined,
              };
            },
          },
        ],
      }),
    );
  }

  return plugins;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: env.ENABLE_PASSWORD_LOGIN,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: getAuthPlugins(),
});

export type Session = typeof auth.$Infer.Session;
