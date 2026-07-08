"use client";

import { signIn, signOut } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function AuthButton({
  session,
  collapsed = false,
}: {
  session: any;
  collapsed?: boolean;
}) {
  const plan = session?.user?.plan === "premium" ? "Premium" : "Free";

  if (session) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full cursor-pointer flex items-center justify-between overflow-clip hover:bg-accent rounded-md outline-none select-none">
            {collapsed ? (
              <img
                src={session.user?.image ?? ""}
                className="w-7 h-7 rounded-full mx-auto"
                alt="User avatar"
              />
            ) : (
              <>
                <div className="flex flex-col items-start">
                  <h2>{session.user?.name!}</h2>
                  <h2 className="text-muted-foreground text-xs text-ellipsis">
                    {session.user?.email!}
                  </h2>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {plan} plan
                  </h2>
                </div>
                <img
                  src={session.user?.image ?? ""}
                  className="w-7 h-7 rounded-full"
                  alt="User avatar"
                />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/api/billing/checkout">Upgrade to Premium</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() =>
                signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = "/";
                    },
                  },
                })
              }
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      className="w-full"
      size={"lg"}
      onClick={async () =>
        await signIn.social({
          provider: "google",
          callbackURL: "/home",
        })
      }
    >
      Signin with Google
    </Button>
  );
}
