import PageShell from "@/components/page-shell";
import { MessageSquare, GitBranch } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <PageShell title="Feedback" description="Help us improve">
      <div className="max-w-md mx-auto">
        <div className="text-center py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-medium">We&apos;d love to hear from you</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Have a suggestion or found a bug? Let us know.
          </p>

          <div className="mt-6 space-y-2">
            <Link
              href="https://github.com/thetanav/vidora/issues/new"
              target="_blank"
              className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent transition-colors">
              <GitBranch className="h-4 w-4" />
              Open an issue on GitHub
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
