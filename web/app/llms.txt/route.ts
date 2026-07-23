import { ALL_SPOTS } from "@/lib/spots";
import { llmsTxt } from "@/lib/structured-data";

// Item 136: static, generated at build from ALL_SPOTS (the chokepoint, so hidden
// spots are excluded). Served at /llms.txt for AI answer engines. Zero runtime cost.
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(ALL_SPOTS), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
