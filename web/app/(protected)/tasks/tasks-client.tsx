"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";

type Event = { id: string; kind: string; attempt: number | null; reason: string | null; createdAt: string };
type Job = { id: string; title: string; status: string; progress: number; createdAt: string; jobEvents: Event[] };
async function loadJobs(): Promise<Job[]> {
  const response = await fetch("/api/videos/jobs", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load processing jobs.");
  return response.json();
}
const labels: Record<string, string> = { pending: "Queued", processing: "Processing", done: "Complete", failed: "Failed" };
const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export default function TasksClient() {
  const queryClient = useQueryClient();
  const [retryError, setRetryError] = useState<string | null>(null);
  const { data: jobs, isLoading, isError, refetch } = useQuery({ queryKey: ["processing-jobs"], queryFn: loadJobs, refetchInterval: 5000 });
  const retry = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/videos/${encodeURIComponent(id)}/retry`, { method: "POST" });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Could not retry this job."); }
    },
    onMutate: () => setRetryError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["processing-jobs"] }),
    onError: (error: Error) => setRetryError(error.message),
  });
  const active = jobs?.filter((job) => job.status === "pending" || job.status === "processing").length ?? 0;
  const failed = jobs?.filter((job) => job.status === "failed").length ?? 0;
  const complete = jobs?.filter((job) => job.status === "done").length ?? 0;
  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div><h2 className="text-xl font-semibold tracking-tight">Job activity</h2><p className="mt-1 text-sm text-muted-foreground">Status and attempt history for your videos. Updates every 5 seconds.</p></div>
      <div className="flex gap-5 text-sm"><span><strong>{active}</strong> <span className="text-muted-foreground">active</span></span><span><strong className={failed ? "text-destructive" : ""}>{failed}</strong> <span className="text-muted-foreground">failed</span></span><span><strong>{complete}</strong> <span className="text-muted-foreground">complete</span></span></div>
    </div>
    {retryError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{retryError}</div>}
    {isLoading && <p className="py-10 text-sm text-muted-foreground">Loading jobs...</p>}
    {isError && <div role="alert" className="py-10 text-sm">Could not load jobs. <button className="underline" onClick={() => refetch()}>Try again</button></div>}
    {jobs?.length === 0 && <div className="rounded-lg border border-dashed border-border p-10 text-center"><Clock3 className="mx-auto mb-3 h-5 w-5 text-muted-foreground"/><p className="font-medium">No jobs yet</p><p className="mt-1 text-sm text-muted-foreground">Upload a video to see its processing activity here.</p></div>}
    <div className="space-y-3">{jobs?.map((job) => <article key={job.id} className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{job.title}</h3><p className="mt-1 text-xs text-muted-foreground">Uploaded {date(job.createdAt)}</p></div><div className="flex items-center gap-3"><span className={`flex items-center gap-1.5 text-sm font-medium ${job.status === "failed" ? "text-destructive" : job.status === "done" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{job.status === "failed" ? <AlertCircle className="h-4 w-4"/> : job.status === "done" ? <CheckCircle2 className="h-4 w-4"/> : <Clock3 className="h-4 w-4"/>}{labels[job.status] || job.status}</span>{job.status === "failed" && <button disabled={retry.isPending} onClick={() => retry.mutate(job.id)} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5"/>{retry.isPending && retry.variables === job.id ? "Queuing..." : "Retry"}</button>}</div></div>
      {(job.status === "processing" || job.status === "pending") && <div className="mt-4"><div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{job.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${job.progress}%` }}/></div></div>}
      {job.jobEvents.length > 0 && <details className="mt-4 border-t border-border pt-3" open={job.status === "failed" ? true : undefined}><summary className="cursor-pointer text-sm font-medium">Activity <span className="font-normal text-muted-foreground">({job.jobEvents.length})</span></summary><ol className="mt-3 space-y-3 border-l border-border pl-4">{job.jobEvents.map((event) => <li key={event.id} className="text-sm"><div className="flex flex-wrap justify-between gap-x-3"><span className="font-medium">{event.kind === "retry" ? "Retry requested" : event.attempt ? `Attempt ${event.attempt} failed` : "Queue failed"}</span><time className="text-xs text-muted-foreground">{date(event.createdAt)}</time></div>{event.reason && <p className="mt-1 break-words text-muted-foreground">{event.reason}</p>}</li>)}</ol></details>}
      {job.status === "failed" && job.jobEvents.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No failure details were recorded for this job.</p>}
    </article>)}</div>
  </div>;
}
