import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "super-admin") {
    redirect("/admin/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome to Overleaf CE Portal
      </h1>
      <p className="text-base text-muted-foreground">
        Your account is signed in as a standard user. To access the admin
        portal, please contact a super administrator for additional permissions.
      </p>
    </main>
  );
}
