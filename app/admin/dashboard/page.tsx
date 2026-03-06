/**
 * Enterprise Admin Dashboard
 * /admin/dashboard - Full system analytics and monitoring
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  healthStatus: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    checks: {
      llm: { primary: boolean; fallback: boolean; latency: number };
      database: boolean;
      config: { loaded: boolean; llmConfigured: boolean };
    };
  };
  metrics: {
    totalRequests: number;
    totalTokens: number;
    averageLatency: number;
    errorRate: number;
    successRate: number;
  };
  systemInfo: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        let health = null;
        let metrics = null;

        // Fetch health separately (should always work)
        try {
          const healthRes = await fetch("/api/health");
          if (healthRes.ok) {
            health = await healthRes.json();
          }
        } catch (e) {
          console.warn("Health check failed:", e);
        }

        // Fetch metrics separately (may fail if no data)
        try {
          const metricsRes = await fetch("/api/evaluation/metrics?days=1", {
            headers: { Authorization: "Bearer admin" },
          });
          if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            metrics = metricsData.data?.metrics;
          }
        } catch (e) {
          console.warn("Metrics fetch failed:", e);
        }

        // Use fallback health if needed
        if (!health) {
          health = {
            status: "degraded",
            timestamp: new Date().toISOString(),
            checks: {
              llm: { primary: false, fallback: false, latency: 0 },
              database: false,
              config: { loaded: false, llmConfigured: false },
            },
          };
        }

        // Use fallback metrics if needed
        if (!metrics) {
          metrics = {
            totalRequests: 0,
            totalTokens: 0,
            averageLatency: 0,
            errorRate: 0,
            successRate: 0,
          };
        }

        setData({
          healthStatus: health,
          metrics: metrics,
          systemInfo: {
            uptime: Date.now(),
            memoryUsage: 45,
            cpuUsage: 32,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-gray-400 mb-4">
            {error || "Failed to load dashboard"}
          </p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const healthColor = {
    healthy: "bg-green-500/20 border-green-500/50 text-green-300",
    degraded: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
    unhealthy: "bg-red-500/20 border-red-500/50 text-red-300",
  }[data.healthStatus.status];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Link
              href="/"
              className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
            >
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">System health & enterprise metrics</p>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-semibold px-4 py-2 rounded-lg border ${healthColor}`}
            >
              Status: {data.healthStatus.status.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* LLM Primary */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-2">LLM Primary</p>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${data.healthStatus.checks.llm.primary ? "bg-green-500" : "bg-red-500"}`}
              />
              <p className="text-xl font-semibold">
                {data.healthStatus.checks.llm.primary ? "UP" : "DOWN"}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {data.healthStatus.checks.llm.latency}ms
            </p>
          </div>

          {/* LLM Fallback */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-2">LLM Fallback</p>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${data.healthStatus.checks.llm.fallback ? "bg-green-500" : "bg-gray-500"}`}
              />
              <p className="text-xl font-semibold">
                {data.healthStatus.checks.llm.fallback ? "UP" : "N/A"}
              </p>
            </div>
          </div>

          {/* Database */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-2">Database</p>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${data.healthStatus.checks.database ? "bg-green-500" : "bg-red-500"}`}
              />
              <p className="text-xl font-semibold">
                {data.healthStatus.checks.database ? "UP" : "DOWN"}
              </p>
            </div>
          </div>

          {/* Config */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-2">Configuration</p>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${data.healthStatus.checks.config.loaded && data.healthStatus.checks.config.llmConfigured ? "bg-green-500" : "bg-yellow-500"}`}
              />
              <p className="text-xl font-semibold">OK</p>
            </div>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Requests (24h)</p>
            <p className="text-3xl font-bold">{data.metrics.totalRequests}</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Total Tokens</p>
            <p className="text-3xl font-bold">
              {(data.metrics.totalTokens / 1000).toFixed(1)}K
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Avg Latency</p>
            <p className="text-3xl font-bold">
              {data.metrics.averageLatency}ms
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Success Rate</p>
            <p className="text-3xl font-bold text-green-400">
              {data.metrics.successRate}%
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Error Rate</p>
            <p className="text-3xl font-bold text-red-400">
              {data.metrics.errorRate}%
            </p>
          </div>
        </div>

        {/* Navigation to Detailed Views */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/agents"
            className="bg-slate-900/50 border border-slate-700 hover:border-slate-600 rounded-lg p-6 transition group"
          >
            <h3 className="text-lg font-semibold text-blue-400 group-hover:text-blue-300 mb-2">
              🤖 Agent Inspector
            </h3>
            <p className="text-sm text-gray-400">
              Monitor agent execution and performance
            </p>
          </Link>

          <Link
            href="/admin/tools"
            className="bg-slate-900/50 border border-slate-700 hover:border-slate-600 rounded-lg p-6 transition group"
          >
            <h3 className="text-lg font-semibold text-green-400 group-hover:text-green-300 mb-2">
              🔧 Tool Explorer
            </h3>
            <p className="text-sm text-gray-400">
              View tool execution history and stats
            </p>
          </Link>

          <Link
            href="/admin/retrieval"
            className="bg-slate-900/50 border border-slate-700 hover:border-slate-600 rounded-lg p-6 transition group"
          >
            <h3 className="text-lg font-semibold text-purple-400 group-hover:text-purple-300 mb-2">
              📚 Retrieval Explorer
            </h3>
            <p className="text-sm text-gray-400">
              Analyze document retrieval performance
            </p>
          </Link>

          <Link
            href="/admin/conversations"
            className="bg-slate-900/50 border border-slate-700 hover:border-slate-600 rounded-lg p-6 transition group"
          >
            <h3 className="text-lg font-semibold text-orange-400 group-hover:text-orange-300 mb-2">
              💬 Conversation Analytics
            </h3>
            <p className="text-sm text-gray-400">
              Deep dive into conversation patterns
            </p>
          </Link>

          <Link
            href="/evaluation"
            className="bg-slate-900/50 border border-slate-700 hover:border-slate-600 rounded-lg p-6 transition group"
          >
            <h3 className="text-lg font-semibold text-violet-400 group-hover:text-violet-300 mb-2">
              📊 Metrics Dashboard
            </h3>
            <p className="text-sm text-gray-400">
              Full metrics and analytics view
            </p>
          </Link>

          <Link
            href="/admin/logs"
            className="bg-slate-900/50 border border-slate-700 hover:border-slate-600 rounded-lg p-6 transition group"
          >
            <h3 className="text-lg font-semibold text-red-400 group-hover:text-red-300 mb-2">
              📋 System Logs
            </h3>
            <p className="text-sm text-gray-400">
              Structured logs and error tracking
            </p>
          </Link>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-gray-600">
          Last updated: {new Date(data.healthStatus.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
