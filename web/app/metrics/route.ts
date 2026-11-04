import { observability } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return new Response(await observability.registry.metrics(), {
    headers: { "Content-Type": observability.registry.contentType, "Cache-Control": "no-store" },
  });
}
