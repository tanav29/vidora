"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, X, Loader2 } from "lucide-react";
import PageShell from "@/components/page-shell";
import { UploadButton } from "@/components/uploadthing";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadedFile {
  name: string;
  size: number;
  url: string;
  key: string;
}

export const dynamic = "force-dynamic";

export default function Page() {
  const router = useRouter();
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [title, setTitle] = useState("Aari Aari");
  const [extension, setExtension] = useState<string | null>(null);
  const [description, setDescription] = useState("Dhurandhar");
  const [id] = useState(() => nanoid(16));
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    mutate: uploadVideo,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/upload`, {
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
        toast.error("Upload failed");
        return null;
      }
      toast.success("Uploaded successfully");
      setTimeout(() => {
        router.push("/home");
      }, 2000);
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
            <div className="text-xs text-muted-foreground text-right">
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
            <Label>
              Video File <span className="text-destructive">*</span>
            </Label>
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-4">
                  Click to upload or drag and drop
                </p>
                <UploadButton
                  endpoint="videoUploader"
                  headers={{ "x-video-id": id }}
                  onClientUploadComplete={async (res) => {
                    if (res[0]) {
                      setFile(res[0]);
                      const ext = res[0].name?.split(".").pop()?.toLowerCase();
                      if (ext) setExtension(ext);
                    }
                  }}
                  onUploadError={(error: Error) => {
                    alert(`ERROR! ${error.message}`);
                  }}
                />
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button
              disabled={!file || !title.trim() || isPending || isSuccess}
              size="lg"
              className="w-full gap-2"
              onClick={() => uploadVideo()}>
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Upload Complete! Redirecting...
                </>
              ) : isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
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
