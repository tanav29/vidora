import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Play } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session?.user) redirect("/home");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* Background */}
      {/* Logo */}

      {/* Card */}
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <Link href="/" className="mb-8 flex items-center gap-2.5 group">
            <div className="w-6 h-6 bg-foreground" style={{ clipPath: "polygon(50% 10%, 10% 90%, 90% 90%)" }} />
            <span className="text-sm font-semibold tracking-tight text-foreground">vidora</span>
          </Link>
          <p className="text-xs text-muted-foreground">Sign in to continue</p>
        </div>

        <GoogleSignInButton />

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms and Privacy Policy
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 text-sm text-muted-foreground hover:text-foreground">
        Back to home
      </Link>
    </div>
  );
}
