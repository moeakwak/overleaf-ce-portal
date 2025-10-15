import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/features/auth/login-form";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  const passwordLoginEnabled = env.ENABLE_PASSWORD_LOGIN;
  const oidcLoginEnabled = env.ENABLE_OIDC_LOGIN;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          passwordLoginEnabled={passwordLoginEnabled}
          oidcLoginEnabled={oidcLoginEnabled}
          oidcProviderName={env.OIDC_PROVIDER_NAME}
          oidcProviderId={env.OIDC_PROVIDER_ID}
        />
      </div>
    </div>
  );
}
