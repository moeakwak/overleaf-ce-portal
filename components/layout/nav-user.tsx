"use client";

import { IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar?: string | null;
    role?: string;
  };
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const initials =
    user.name
      ?.split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || user.email.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch (_error) {
      toast.error("Failed to sign out, please try again later.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg" className="group">
          <div className="flex w-full items-center gap-3">
            <Avatar className="h-8 w-8 rounded-lg grayscale">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            </div>
            <button
              type="button"
              className="ml-auto flex size-8 items-center justify-center rounded-md border border-transparent transition-colors hover:border-sidebar-accent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-60"
              aria-label="Log out"
              title="Log out"
              disabled={isSigningOut}
              onClick={(event) => {
                event.stopPropagation();
                void handleSignOut();
              }}
            >
              {isSigningOut ? (
                <IconLogout className="size-4 animate-pulse" />
              ) : (
                <IconLogout className="size-4" />
              )}
            </button>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
