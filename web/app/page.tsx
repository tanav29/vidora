import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const features = [
  { title: "Simple uploads", desc: "Drag, drop, and go" },
  { title: "Auto-transcoding", desc: "HLS + MP4 outputs" },
  { title: "Shareable links", desc: "Instant playback URLs" },
];

export default async function LandingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
              <Play className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="font-semibold text-sm">vidora</span>
          </Link>

          {session?.user ? (
            <Button asChild size="sm">
              <Link href="/home">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </header>

        {/* Hero */}
        <section className="mt-20 text-center">
          <h1 className="mx-auto max-w-2xl text-4xl font-medium tracking-tight sm:text-5xl">
            Video hosting that just works
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Upload, transcode, and share your videos with a clean, fast
            dashboard.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            {session?.user ? (
              <Button asChild size="lg" className="gap-2">
                <Link href="/upload">
                  Start uploading
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="gap-2">
                <Link href="/login">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {session?.user && (
              <Button asChild variant="outline" size="lg">
                <Link href="/home">View dashboard</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Preview */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-xl border bg-card/50 p-2">
            <div className="aspect-video rounded-lg bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Play className="h-5 w-5 text-muted-foreground fill-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-12 grid grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="text-center">
              <p className="font-medium text-sm">{f.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-20 flex items-center justify-between border-t pt-8 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} vidora</span>
          <div className="flex gap-4">
            <Link href="/home" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/upload" className="hover:text-foreground">
              Upload
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
