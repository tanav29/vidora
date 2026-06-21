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
      <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-foreground">{title}</h1>
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
