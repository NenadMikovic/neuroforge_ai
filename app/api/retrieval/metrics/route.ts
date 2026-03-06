/**
 * GET /api/retrieval/metrics - Get retrieval metrics for user
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRetrievalMetrics,
  getTopDocumentsByRetrievals,
} from "@/lib/db/service";

export const runtime = "nodejs";

/**
 * GET /api/retrieval/metrics?userId=xxx&type=all|top
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const type = (request.nextUrl.searchParams.get("type") as string) || "all";
    const limit =
      parseInt(request.nextUrl.searchParams.get("limit") as string) || 10;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    let data: any;

    if (type === "top") {
      data = await getTopDocumentsByRetrievals(userId, limit);
    } else {
      data = await getRetrievalMetrics(userId);
    }

    return NextResponse.json({
      success: true,
      metrics: data,
      type,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[Retrieval Metrics Error]", errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
