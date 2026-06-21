import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import SidebarShell from "./sidebar-shell";

export default async function Sidebar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return <SidebarShell session={session} />;
}
