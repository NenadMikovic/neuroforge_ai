/**
 * Health Check Endpoint
 * GET /api/health - System health status
 */

import { NextResponse } from "next/server";
import LLMService from "@/lib/services/LLMService";
import ConfigManager from "@/lib/config/ConfigManager";
import Logger from "@/lib/logger/Logger";
import { prisma } from "@/lib/db/service";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    llm: {
      primary: boolean;
      fallback: boolean;
      latency: number;
    };
    database: boolean;
    config: {
      loaded: boolean;
      llmConfigured: boolean;
    };
  };
  details?: {
    message: string;
    lastLLMCheck?: string;
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now();

  try {
    // Check LLM health
    const llmHealth = await LLMService.checkHealth();
    const llmHealthy = llmHealth.primary || llmHealth.fallback;

    // Check database health
    let dbHealthy = false;
    try {
      await (prisma as any).conversation?.count();
      dbHealthy = true;
    } catch (e) {
      Logger.warn("Health Check", "Database check failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Check configuration
    const config = ConfigManager.getConfig();
    const configHealthy = !!(config.llm.primary.url && config.llm.primary.name);

    // Determine overall status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    let details: { message: string; lastLLMCheck?: string } | undefined;

    if (!llmHealthy && !dbHealthy) {
      status = "unhealthy";
      details = {
        message: "Critical services down: LLM and Database",
      };
    } else if (!llmHealthy || !dbHealthy) {
      status = "degraded";
      details = {
        message: `${!llmHealthy ? "LLM" : "Database"} service unavailable`,
        lastLLMCheck: llmHealth.lastChecked.toISOString(),
      };
    }

    const response: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        llm: {
          primary: llmHealth.primary,
          fallback: llmHealth.fallback,
          latency: llmHealth.latency,
        },
        database: dbHealthy,
        config: {
          loaded: true,
          llmConfigured: configHealthy,
        },
      },
      details,
    };

    const duration = Date.now() - startTime;
    Logger.info("HealthCheck", `Health check completed in ${duration}ms`, {
      status,
      duration,
    });

    return NextResponse.json(response, {
      status: status === "healthy" ? 200 : status === "degraded" ? 503 : 503,
    });
  } catch (error) {
    Logger.error(
      "HealthCheck",
      "Health check failed",
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {
          llm: { primary: false, fallback: false, latency: 0 },
          database: false,
          config: { loaded: false, llmConfigured: false },
        },
        details: {
          message: "Health check error",
        },
      },
      { status: 503 },
    );
  }
}
