"use client";

import { useQuery } from "@tanstack/react-query";
import { signIn, signOut } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface QuotaResponse {
  plan: "free" | "plus";
  limit: number;
  uploads: number;
  cycleStart: string;
}

export default function AuthButton({
  session,
  collapsed = false,
}: {
  session: any;
  collapsed?: boolean;
}) {
  const plan = session?.user?.plan === "plus" ? "Plus" : "Free";
  const quotaQuery = useQuery<QuotaResponse>({
    queryKey: ["account-quota"],
    queryFn: async () => {
      const res = await fetch("/api/quota", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load quota");
      }

      return res.json();
    },
    enabled: Boolean(session?.user?.id),
    staleTime: 30_000,
  });

  const quota = quotaQuery.data;
  const resetAt = quota
    ? new Date(new Date(quota.cycleStart).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const resetLabel = resetAt
    ? resetAt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  if (session) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex w-full cursor-pointer items-center justify-between overflow-clip select-none outline-none" />
          }>
            {collapsed ? (
              <img
                src={session.user?.image ?? ""}
                className="mx-auto h-5 w-5 rounded-full"
                alt="User avatar"
              />
            ) : (
              <>
                <div className="flex flex-col items-start">
                  <h2 className="text-sm">{session.user?.name!}</h2>
                  <h2 className="text-xs text-muted-foreground">{plan} plan</h2>
                </div>
                <img
                  src={session.user?.image ?? ""}
                  className="h-7 w-7 rounded-full"
                  alt="User avatar"
                />
              </>
            )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  {session.user?.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {quotaQuery.isLoading
                    ? `${plan} plan - loading usage`
                    : quota
                      ? `${quota.plan === "plus" ? "Plus" : "Free"} plan - ${quota.uploads}/${quota.limit} uploads used`
                      : `${plan} plan`}
                </div>
                {resetLabel ? (
                  <div className="text-xs text-muted-foreground">
                    Resets on {resetLabel}
                  </div>
                ) : null}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href="/profile" />} nativeButton={false}>
              Profile
            </DropdownMenuItem>
            {quota?.plan === "free" ? (
              <DropdownMenuItem render={<Link href="/api/billing/checkout" />} nativeButton={false}>
                Upgrade to Plus
              </DropdownMenuItem>
            ) : null}
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
              }>
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
      }>
      Signin with Google
    </Button>
  );
}
