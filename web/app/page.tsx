import Link from "next/link";
import { ArrowUpRight, Clapperboard, Layers, UploadCloud } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const features = [
  { icon: UploadCloud, title: "Upload once", description: "Send your video straight from your browser and choose the resolutions you need." },
  { icon: Layers, title: "Ready for every screen", description: "Vidora turns your video into adaptive streams in the background." },
  { icon: Clapperboard, title: "Keep it together", description: "Find your videos, track processing, and copy playback links from one library." },
];

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const destination = session?.user ? "/home" : "/login";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#17233a]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#284fc4] text-white"><Clapperboard className="h-4 w-4" /></span>
          vidora
        </Link>
        <Link href={destination} className="rounded-full border border-[#cbd5e6] bg-white px-5 py-2 text-sm font-medium hover:border-[#284fc4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#284fc4]">
          {session?.user ? "Open library" : "Sign in"}
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 sm:px-10">
        <section className="grid items-center gap-12 pb-20 pt-14 md:grid-cols-[1fr_1fr] md:gap-16 md:pb-28 md:pt-24">
          <div>
            <p className="mb-5 text-sm font-semibold text-[#284fc4]">Your video library, ready to play</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-6xl">A better home for your videos.</h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-[#59677e]">Upload your video, let Vidora prepare it for streaming, and share it when it’s ready.</p>
            <Link href={session?.user ? "/upload" : "/login"} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#284fc4] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1f3fa2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#284fc4]">
              {session?.user ? "Upload a video" : "Get started"} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div aria-hidden="true" className="relative rounded-2xl bg-[#18284a] p-4 shadow-2xl shadow-[#243a6b]/20 sm:p-6">
            <div className="flex items-center justify-between pb-4 text-xs text-blue-100/70"><span>Vidora library</span><span>Ready to share</span></div>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-[#526dab]">
              <div className="absolute -bottom-20 -left-8 h-56 w-56 rounded-full bg-[#7894cb]" />
              <div className="absolute -right-8 -top-20 h-56 w-56 rounded-full border-[32px] border-[#9eb5df]/50" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg"><span className="ml-1 h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-[#284fc4]" /></div>
            </div>
            <div className="flex items-center justify-between pt-5 text-sm text-white"><span>Made for the moment</span><span className="rounded-full bg-[#d1e6d9] px-3 py-1 text-xs font-medium text-[#21583b]">Ready</span></div>
          </div>
        </section>
        <section className="border-t border-[#dce3ee] py-14 sm:py-20">
          <div className="grid gap-10 md:grid-cols-3 md:gap-12">
            {features.map(({ icon: Icon, title, description }) => <div key={title}><Icon className="mb-5 h-6 w-6 text-[#284fc4]" /><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#59677e]">{description}</p></div>)}
          </div>
        </section>
        <section className="mb-16 rounded-2xl border border-[#dce3ee] bg-white p-7 sm:flex sm:items-center sm:justify-between sm:p-9">
          <div><p className="text-sm font-semibold text-[#284fc4]">No account or setup needed</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Take a guided product tour</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#59677e]">Explore a sample library and the upload-to-stream workflow with realistic demo data.</p></div>
          <Link href="/demo" className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-full border border-[#cbd5e6] px-5 py-2.5 text-sm font-semibold hover:border-[#284fc4] sm:ml-6 sm:mt-0">Explore demo <ArrowUpRight className="h-4 w-4" /></Link>
        </section>
      </main>
      <footer className="border-t border-[#dce3ee]"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-7 text-sm text-[#59677e] sm:px-10"><span>© {new Date().getFullYear()} Vidora</span><Link href={destination} className="hover:text-[#284fc4]">{session?.user ? "Your library" : "Sign in"}</Link></div></footer>
    </div>
  );
}
