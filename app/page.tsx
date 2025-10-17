import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserDashboard } from "@/components/features/user-dashboard/user-dashboard";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return <UserDashboard session={session} />;
}
