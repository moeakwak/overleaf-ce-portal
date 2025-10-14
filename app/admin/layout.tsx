import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminLayoutShell } from "@/components/layout/admin-shell";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "super-admin") {
    redirect("/");
  }

  return <AdminLayoutShell session={session}>{children}</AdminLayoutShell>;
}
