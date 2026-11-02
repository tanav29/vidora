import PageShell from "@/components/page-shell";
import TasksClient from "./tasks-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PageShell title="Processing" description="Track jobs and recover failed uploads">
      <TasksClient />
    </PageShell>
  );
}
