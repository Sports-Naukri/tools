import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/ip";
import { getUsageSnapshot } from "@/lib/rateLimiter";

export const runtime = "edge";
export const preferredRegion = ["bom1", "sin1", "fra1"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId") ?? undefined;

  const ip = getClientIp(req.headers);
  const usage = await getUsageSnapshot(ip, conversationId);

  return NextResponse.json(usage);
}
