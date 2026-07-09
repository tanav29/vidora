"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  Crown,
  MessageSquare,
  LayoutDashboard,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import AuthButton from "./signin";

const SidebarContext = createContext({ collapsed: false });

const navItems = [
  { path: "/home", label: "Videos", icon: LayoutDashboard },
  { path: "/tasks", label: "Tasks", icon: Activity },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/upgrade", label: "Upgrade", icon: Crown },
  { path: "/feedback", label: "Feedback", icon: MessageSquare },
];

interface SidebarShellProps {
  session: any;
}

export default function SidebarShell({ session }: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed, mounted]);

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div
        className={cn(
          "relative flex flex-col border-r border-border bg-background transition-opacity duration-150 ease-in-out",
          collapsed ? "w-12" : "w-60",
        )}>
        <div className={cn("p-4", collapsed && "flex justify-center")}>
          <Link href="/home" className="flex items-center gap-3 group" prefetch>
            <span className="font-semibold text-foreground text-base tracking-tight whitespace-nowrap">
              {collapsed ? "v" : "vidora"}
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-2.5 py-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.path ||
              (item.path !== "/home" && pathname?.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch
                className={cn(
                  "flex items-center gap-2 text-sm group",
                  collapsed ? "justify-center p-2" : "px-3 py-1.5",
                  active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}>
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground/70 group-hover:text-foreground",
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "p-2.5 border-t border-border",
            collapsed && "px-2 flex justify-center",
          )}>
          <AuthButton session={session} collapsed={collapsed} />
        </div>

        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute -right-3 top-4 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? (
            <PanelLeftOpen className="h-3 w-3" />
          ) : (
            <PanelLeftClose className="h-3 w-3" />
          )}
        </button>
      </div>
    </SidebarContext.Provider>
  );
}
