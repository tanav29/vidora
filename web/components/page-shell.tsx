import type React from "react";

interface PageShellProps {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageShell({
  title,
  description,
  right,
  children,
}: PageShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 border-b border-border">
        <div className="flex h-12 items-center justify-between px-6">
          <div className="min-w-0">
            <h1 className="text-xs font-semibold tracking-tight text-foreground">{title}</h1>
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
