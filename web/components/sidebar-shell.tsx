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
  Play,
  Activity,
  MessageSquare,
  LayoutDashboard,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import AuthButton from "./signin";

const SidebarContext = createContext({ collapsed: false });

const navItems = [
  { path: "/home", label: "Videos", icon: LayoutDashboard },
  { path: "/tasks", label: "Tasks", icon: Activity },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/feedback", label: "Feedback", icon: MessageSquare },
];

interface SidebarShellProps {
  session: any;
}

export default function SidebarShell({ session }: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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
          "relative flex flex-col border-r border-border/50 bg-card/30 transition-all duration-100 ease-in-out",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn("p-5", collapsed && "px-3 py-5 flex justify-center")}
        >
          <Link
            href="/home"
            className="flex items-center gap-2.5 group"
            prefetch
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:shadow-violet-500/20 transition-shadow shrink-0">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-foreground text-xl tracking-tight whitespace-nowrap">
                vidora
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = false;
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch
                className={cn(
                  "flex items-center gap-2.5 rounded-lg text-sm transition-colors duration-500 group",
                  collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                  active
                    ? "bg-foreground/5 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 group-hover:text-foreground",
                    active ? "text-foreground" : "text-muted-foreground/70",
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("p-3", collapsed && "px-2 flex justify-center")}>
          <AuthButton session={session} collapsed={collapsed} />
        </div>

        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </SidebarContext.Provider>
  );
}
