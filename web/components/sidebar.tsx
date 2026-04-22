import Link from "next/link";
import {
  Play,
  Activity,
  MessageSquare,
  LayoutDashboard,
  Upload,
} from "lucide-react";
import AuthButton from "./signin";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const navItems = [
  { path: "/home", label: "Videos", icon: LayoutDashboard },
  { path: "/tasks", label: "Tasks", icon: Activity },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/feedback", label: "Feedback", icon: MessageSquare },
];

export default async function Sidebar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <aside className="w-64 flex flex-col border-r border-border/50 bg-card/30">
      <div className="p-5">
        <Link href="/home" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:shadow-violet-500/20 transition-shadow">
            <Play className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="font-semibold text-foreground text-xl tracking-tight">
            vidora
          </span>
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-500 group ${
                active
                  ? "bg-foreground/5 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              prefetch={true}
            >
              <Icon
                className={cn(
                  "w-4 h-4 group-hover:text-foreground",
                  active ? "text-foreground" : "text-muted-foreground/70 ",
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <AuthButton session={session} />
      </div>
    </aside>
  );
}
