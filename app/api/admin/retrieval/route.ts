/**
 * Admin Retrieval Explorer API
 * GET /api/admin/retrieval - Retrieval events and document stats
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "150"), 500);

    const sourceRows = await (prisma as any).messageSource?.findMany({
      orderBy: { createdAt: "desc" },
      take: limit * 5,
      include: {
        message: {
          select: {
            id: true,
            conversationId: true,
            role: true,
            content: true,
            createdAt: true,
            latency: true,
          },
        },
        document: {
          select: {
            id: true,
            name: true,
          },
        },
        chunk: {
          select: {
            id: true,
            chunkIndex: true,
            content: true,
          },
        },
      },
    });

    if (!sourceRows || sourceRows.length === 0) {
      return NextResponse.json({ results: [], docStats: [] });
    }

    const conversationIds = Array.from(
      new Set(
        sourceRows
          .map((row: any) => row.message?.conversationId)
          .filter(Boolean),
      ),
    );

    const metrics =
      conversationIds.length > 0
        ? (await (prisma as any).metricsRecord?.findMany({
            where: {
              conversationId: { in: conversationIds },
            },
            orderBy: { createdAt: "desc" },
            select: {
              conversationId: true,
              modelUsed: true,
            },
          })) || []
        : [];

    const modelByConversation = new Map<string, string>();
    for (const metric of metrics) {
      if (
        metric.conversationId &&
        metric.modelUsed &&
        !modelByConversation.has(metric.conversationId)
      ) {
        modelByConversation.set(metric.conversationId, metric.modelUsed);
      }
    }

    const messagesByConversation =
      conversationIds.length > 0
        ? (await (prisma as any).message?.findMany({
            where: {
              conversationId: { in: conversationIds },
            },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              conversationId: true,
              role: true,
              content: true,
              createdAt: true,
            },
          })) || []
        : [];

    const conversationMessageMap = new Map<string, any[]>();
    for (const msg of messagesByConversation) {
      const existing = conversationMessageMap.get(msg.conversationId) || [];
      existing.push(msg);
      conversationMessageMap.set(msg.conversationId, existing);
    }

    const groupedByMessage = new Map<string, any[]>();
    for (const row of sourceRows) {
      if (!row.message?.id) continue;
      const list = groupedByMessage.get(row.message.id) || [];
      list.push(row);
      groupedByMessage.set(row.message.id, list);
    }

    const results = Array.from(groupedByMessage.entries())
      .map(([messageId, rows]) => {
        const first = rows[0];
        const msg = first.message;
        if (!msg) return null;

        const convMessages =
          conversationMessageMap.get(msg.conversationId) || [];
        const messageIndex = convMessages.findIndex((m) => m.id === messageId);

        let query = msg.content;
        if (msg.role === "assistant" && messageIndex > 0) {
          for (let i = messageIndex - 1; i >= 0; i--) {
            if (convMessages[i].role === "user") {
              query = convMessages[i].content;
              break;
            }
          }
        }

        const docs = rows.map((r: any) => ({
          id: r.document.id,
          title: r.document.name,
          relevanceScore: r.similarity,
          excerpt: (r.chunk?.content || "").slice(0, 260),
          chunkIndex: r.chunk?.chunkIndex,
        }));

        return {
          id: messageId,
          query,
          timestamp: msg.createdAt.toISOString(),
          documentsRetrieved: docs.length,
          totalDuration: msg.latency || 0,
          documents: docs,
          model: modelByConversation.get(msg.conversationId) || "ollama",
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    const docStatsMap = new Map<string, any>();
    for (const result of results as any[]) {
      for (const doc of result.documents) {
        const existing = docStatsMap.get(doc.id) || {
          documentId: doc.id,
          title: doc.title,
          totalRetrievals: 0,
          averageRelevance: 0,
          lastRetrieved: result.timestamp,
        };

        existing.totalRetrievals += 1;
        existing.averageRelevance =
          (existing.averageRelevance * (existing.totalRetrievals - 1) +
            doc.relevanceScore) /
          existing.totalRetrievals;

        if (new Date(result.timestamp) > new Date(existing.lastRetrieved)) {
          existing.lastRetrieved = result.timestamp;
        }

        docStatsMap.set(doc.id, existing);
      }
    }

    const docStats = Array.from(docStatsMap.values()).sort(
      (a, b) => b.totalRetrievals - a.totalRetrievals,
    );

    return NextResponse.json({
      results,
      docStats,
    });
  } catch (error) {
    console.error("[Admin Retrieval API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch retrieval data",
        details: error instanceof Error ? error.message : String(error),
        results: [],
        docStats: [],
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
