import PageShell from "@/components/page-shell";
import { MessageSquare, GitBranch } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <PageShell title="Feedback" description="Help us improve">
      <div className="max-w-sm mx-auto mt-12">
        <div className="border border-border rounded-lg bg-card p-6 shadow-sm text-center">
          <div className="mx-auto w-8 h-8 rounded-full border border-border flex items-center justify-center bg-muted/40 mb-4 text-foreground/80">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-semibold tracking-tight text-foreground">We&apos;d love to hear from you</h3>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Have a suggestion or found a bug? Open a Git issue.
          </p>

          <div className="mt-6">
            <Button
              render={
                <Link
                  href="https://github.com/thetanav/vidora/issues/new"
                  target="_blank"
                  className="flex items-center justify-center gap-2"
                />
              }
              variant="outline"
              className="w-full text-xs h-9"
              nativeButton={false}>
              <GitBranch className="h-3.5 w-3.5" />
              Open GitHub Issue
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
