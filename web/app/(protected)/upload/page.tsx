"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import PageShell from "@/components/page-shell";
import { UploadButton } from "@/components/uploadthing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface UploadedFile {
  name: string;
  size: number;
  url: string;
  key: string;
}

interface QuotaResponse {
  plan: "free" | "plus";
  limit: number;
  uploads: number;
  cycleStart: string;
}

export const dynamic = "force-dynamic";

export default function Page() {
  const router = useRouter();
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [title, setTitle] = useState("");
  const [extension, setExtension] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [id] = useState(() => nanoid(16));
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const quotaQuery = useQuery<QuotaResponse>({
    queryKey: ["upload-quota"],
    queryFn: async () => {
      const res = await fetch("/api/quota", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load quota");
      }

      return res.json();
    },
    staleTime: 30_000,
  });

  const quota = quotaQuery.data;
  const isQuotaLocked = quota ? quota.uploads >= quota.limit : false;
  const canUpload = Boolean(quota) && !isQuotaLocked;
  const resetAt = quota
    ? new Date(new Date(quota.cycleStart).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const resetLabel = resetAt
    ? resetAt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const {
    mutate: uploadVideo,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          id,
          extension,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.error ?? "Upload failed");
        return null;
      }

      toast.success("Video saved and queued for processing");
      setTimeout(() => {
        router.push("/home");
      }, 1500);
      return { success: true };
    },
  });

  const removeFile = () => {
    setFile(null);
    setExtension(null);
  };

  return (
    <main>
      <PageShell title="Upload" description="Add a new video">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-tight text-foreground">
                  <Crown className="h-4 w-4" />
                  {quotaQuery.isLoading
                    ? "Loading plan details"
                    : quota?.plan === "plus"
                      ? "Plus plan"
                      : "Free plan"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {quotaQuery.isLoading
                    ? "Checking your current monthly upload allowance."
                    : quota
                      ? `You have used ${quota.uploads} of ${quota.limit} uploads this month.`
                      : "Your monthly quota could not be loaded."}
                </p>
                {quota ? (
                  <p className="text-xs text-muted-foreground">
                    {resetLabel
                      ? `Current cycle started ${new Date(quota.cycleStart).toLocaleDateString()} and resets on ${resetLabel}.`
                      : `Current cycle started ${new Date(quota.cycleStart).toLocaleDateString()}.`}
                  </p>
                ) : null}
              </div>
              {!quotaQuery.isLoading && quota?.plan === "free" ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/api/billing/checkout">Upgrade to Plus</Link>
                </Button>
              ) : null}
            </div>
            {isQuotaLocked ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Monthly upload limit reached</p>
                  <p>
                    Free accounts can upload 3 videos per month. Plus accounts
                    can upload 10. Upgrade to continue this month.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">
              Video details
            </h2>
            <p className="text-sm text-muted-foreground">
              Fill in the information about your video.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              maxLength={120}
              placeholder="A great title (required)"
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
            <div className="text-right text-xs text-muted-foreground">
              {title.trim().length} / 120 characters
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              placeholder="Tell viewers what this video is about..."
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-tight text-foreground">
              Video File <span className="text-destructive">*</span>
            </Label>
            {quotaQuery.isLoading ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/15 p-8 text-center">
                <p className="text-xs font-semibold text-foreground">
                  Loading upload allowance...
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  File upload will unlock once your quota is known.
                </p>
              </div>
            ) : quotaQuery.isError ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/15 p-8 text-center">
                <p className="text-xs font-semibold text-foreground">
                  Unable to load upload allowance
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Refresh the page to try again. Uploads stay locked until quota data is available.
                </p>
              </div>
            ) : isQuotaLocked ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/15 p-8 text-center">
                <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground/80">
                  <Crown className="h-4 w-4" />
                </div>
                <p className="mb-2 text-xs font-semibold text-foreground">
                  Uploads are paused until you upgrade
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  Your free monthly quota is exhausted. Plus raises the cap to
                  10 uploads per month.
                </p>
                {resetLabel ? (
                  <p className="mb-4 text-xs text-muted-foreground">
                    This cycle resets on {resetLabel}.
                  </p>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link href="/api/billing/checkout">Go Plus</Link>
                </Button>
              </div>
            ) : file ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/25 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40 text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {file.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} mb
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="cursor-pointer rounded-lg border border-dashed border-border p-8 text-center transition-all duration-150 hover:border-foreground/20 hover:bg-muted/15">
                <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-foreground/80">
                  <Upload className="h-4 w-4" />
                </div>
                <p className="mb-3 text-xs font-semibold text-foreground">
                  Click to upload or drag and drop
                </p>
                <div className="flex justify-center">
                  <UploadButton
                    endpoint="videoUploader"
                    headers={{ "x-video-id": id }}
                    onClientUploadComplete={async (res) => {
                      if (res[0]) {
                        setFile(res[0]);
                        const ext = res[0].name?.split(".").pop()?.toLowerCase();
                        if (ext) setExtension(ext);
                        if (!title.trim()) {
                          setTitle(res[0].name.replace(/\.[^/.]+$/, ""));
                        }
                      }
                    }}
                    onUploadError={(error: Error) => {
                      toast.error(error.message || "Upload failed");
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button
              disabled={
                !file ||
                !title.trim() ||
                isPending ||
                isSuccess ||
                !canUpload ||
                quotaQuery.isLoading
              }
              size="default"
              className="h-10 w-full gap-2"
              onClick={() => uploadVideo()}
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Upload Complete
                </>
              ) : isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Video
                </>
              )}
            </Button>
          </div>
        </div>
      </PageShell>

      {/* Hidden elements for video processing */}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}
