import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const features = [
  { id: "01", title: "Instant uploads", desc: "Drag, drop, and stream directly from the edge." },
  { id: "02", title: "Automated HLS pipeline", desc: "Adaptive bitrate streaming with MP4 fallback outputs." },
  { id: "03", title: "Developer-focused APIs", desc: "Integrate playback surfaces with secure sharing URLs." },
];

export default async function LandingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased font-sans flex flex-col justify-between">
      {/* Upper Border Accent */}
      <div className="h-[2px] w-full bg-foreground opacity-10" />

      <div className="mx-auto max-w-4xl w-full px-6 py-8 flex-1 flex flex-col justify-between">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Minimalist Monochrome Triangle Logo */}
            <div className="w-5 h-5 bg-foreground" style={{ clipPath: "polygon(50% 10%, 10% 90%, 90% 90%)" }} />
            <span className="font-semibold text-sm tracking-tight text-foreground">vidora</span>
          </Link>

          {session?.user ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/home">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </header>

        {/* Hero Section */}
        <section className="mt-20 md:mt-28 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
            Video hosting designed for developers.
          </h1>

          <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
            Upload, transcode, and distribute video content with a high-contrast,
            ultra-minimalist dashboard. Fast HLS conversion with shareable playback surfaces.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {session?.user ? (
              <Button asChild size="default">
                <Link href="/upload">Start Uploading</Link>
              </Button>
            ) : (
              <Button asChild size="default">
                <Link href="/login">Get Started</Link>
              </Button>
            )}

            {session?.user && (
              <Button asChild variant="outline" size="default">
                <Link href="/home">View Dashboard</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Preview Container */}
        <section className="mt-16 border border-border bg-muted/20 rounded-lg p-2 overflow-hidden aspect-[21/9] flex items-center justify-center relative">
          <div className="absolute inset-0 bg-radial-gradient from-foreground/[0.03] to-transparent" />
          <div className="text-center relative z-10 flex flex-col items-center gap-2">
            <div className="h-10 w-10 flex items-center justify-center rounded-full border border-border bg-background shadow-xs text-foreground/80 hover:text-foreground hover:scale-105 transition-all">
              <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
            </div>
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Demo Playback</span>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-border pt-12">
          {features.map((f) => (
            <div key={f.id} className="space-y-2">
              <div className="font-mono text-xs text-muted-foreground">{f.id} //</div>
              <h3 className="font-semibold text-sm text-foreground tracking-tight">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/10">
        <div className="mx-auto max-w-4xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-muted-foreground/80" style={{ clipPath: "polygon(50% 10%, 10% 90%, 90% 90%)" }} />
            <span>© {new Date().getFullYear()} vidora. Built on Vercel aesthetics.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/home" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/upload" className="hover:text-foreground transition-colors">
              Upload
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
