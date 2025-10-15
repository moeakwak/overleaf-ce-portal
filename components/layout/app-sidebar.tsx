"use client";

import {
  IconDashboard,
  IconDatabase,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconSettings,
  IconUserShield,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import type * as React from "react";

import { NavMain } from "@/components/layout/nav-main";
import { NavSecondary } from "@/components/layout/nav-secondary";
import { NavUser } from "@/components/layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Session } from "@/lib/auth";

const navigation = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Overleaf Users",
      url: "/admin/overleaf-users",
      icon: IconUsers,
    },
    {
      title: "Portal Users",
      url: "/admin/portal-users",
      icon: IconUserShield,
    },
    {
      title: "Projects",
      url: "/admin/projects",
      icon: IconFolder,
    },
    {
      title: "System",
      url: "/admin/system",
      icon: IconDatabase,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/admin/settings",
      icon: IconSettings,
    },
    {
      title: "Help",
      url: "/admin/help",
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({
  session,
  ...props
}: React.ComponentProps<typeof Sidebar> & { session: Session }) {
  const user = {
    name: session.user.name ?? "Administrator",
    email: session.user.email,
    avatar: session.user.image ?? null,
    role: session.user.role,
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/admin/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">
                  Overleaf CE Portal
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigation.navMain} />
        <NavSecondary items={navigation.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
