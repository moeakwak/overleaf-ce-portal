"use client";

import { IconLoader } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type LoginFormProps = React.ComponentProps<"div"> & {
  passwordLoginEnabled: boolean;
  oidcLoginEnabled: boolean;
  oidcProviderName: string;
  oidcProviderId: string;
};

export function LoginForm({
  className,
  passwordLoginEnabled,
  oidcLoginEnabled,
  oidcProviderName,
  oidcProviderId,
  ...props
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOidcRedirecting, setIsOidcRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordLoginEnabled || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await authClient.signIn.email(
        {
          email,
          password,
        },
        {
          onError: (ctx) => {
            setError(ctx.error.message);
          },
        },
      );

      if (signInError) {
        setError(
          signInError.message ?? "Login failed, please try again later.",
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed, please try again later.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOidcSignIn = async () => {
    if (!oidcLoginEnabled || isOidcRedirecting) return;

    setError(null);
    setIsOidcRedirecting(true);

    try {
      // On success: data contains { url: string, redirect: boolean }
      // By default, it automatically redirects to the OAuth provider
      const { data, error } = await authClient.signIn.oauth2({
        providerId: oidcProviderId,
        callbackURL: "/",
      });

      // Check for errors
      if (error) {
        setIsOidcRedirecting(false);
        setError(error.message || "OIDC login failed");
        return;
      }

      // If we reach here, the redirect should have already happened
      // This is a fallback in case auto-redirect is disabled
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setIsOidcRedirecting(false);
      setError(
        err instanceof Error
          ? err.message
          : "OIDC login failed, please try again later.",
      );
    }
  };

  const authenticationDisabled = !passwordLoginEnabled && !oidcLoginEnabled;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {passwordLoginEnabled ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="#"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <IconLoader className="size-4 animate-spin" />
                          <span>Logging in...</span>
                        </span>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="#" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Password login is currently disabled. Please use the available
                single sign-on options.
              </p>
            )}

            {oidcLoginEnabled ? (
              <Button
                type="button"
                variant={passwordLoginEnabled ? "outline" : "default"}
                className="w-full"
                onClick={handleOidcSignIn}
                disabled={isOidcRedirecting}
              >
                {isOidcRedirecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <IconLoader className="size-4 animate-spin" />
                    <span>Redirecting...</span>
                  </span>
                ) : (
                  `Login with ${oidcProviderName}`
                )}
              </Button>
            ) : null}

            {authenticationDisabled ? (
              <p className="text-sm text-destructive">
                No authentication methods are enabled. Please contact your
                administrator.
              </p>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
